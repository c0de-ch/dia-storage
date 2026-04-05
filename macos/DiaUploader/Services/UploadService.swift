import Foundation
import Combine

final class UploadService: ObservableObject {
    private var uploadTask: Task<Void, Never>?
    private var isCancelled = false

    /// Maximum concurrent uploads
    private let concurrentBatchSize = 3

    /// Maximum retry attempts per file
    private let maxRetries = 3

    // MARK: - Connection Test

    func testConnection(serverURL: String, apiKey: String) async throws -> Bool {
        let url = buildURL(serverURL: serverURL, path: "/api/v1/health")
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue(apiKey, forHTTPHeaderField: "X-Api-Key")
        request.timeoutInterval = 10

        let session = makeURLSession()
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            return false
        }

        if httpResponse.statusCode == 200 {
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let status = json["status"] as? String {
                return status == "ok"
            }
        }

        return false
    }

    // MARK: - Upload

    func uploadFiles(files: [URL], appState: AppState) async {
        isCancelled = false

        await MainActor.run {
            appState.isUploading = true
            appState.totalCount = files.count
            appState.uploadedCount = 0
            appState.uploadProgress = 0.0
            appState.error = nil
        }

        let serverURL = await MainActor.run { appState.serverURL }
        let apiKey = await MainActor.run { appState.apiKey }
        var successCount = 0
        var failureCount = 0
        let startTime = Date()

        // Process files in batches
        let batches = stride(from: 0, to: files.count, by: concurrentBatchSize).map {
            Array(files[$0..<min($0 + concurrentBatchSize, files.count)])
        }

        for batch in batches {
            guard !isCancelled else { break }

            await withTaskGroup(of: Bool.self) { group in
                for file in batch {
                    group.addTask { [weak self] in
                        guard let self = self, !self.isCancelled else { return false }

                        await MainActor.run {
                            appState.currentFileName = file.lastPathComponent
                        }

                        let success = await self.uploadSingleFile(
                            file: file,
                            serverURL: serverURL,
                            apiKey: apiKey
                        )

                        return success
                    }
                }

                for await result in group {
                    if result {
                        successCount += 1
                    } else {
                        failureCount += 1
                    }

                    let totalProcessed = successCount + failureCount
                    let elapsed = Date().timeIntervalSince(startTime)

                    await MainActor.run {
                        appState.uploadedCount = totalProcessed
                        appState.uploadProgress = Double(totalProcessed) / Double(files.count)

                        // Calculate upload speed
                        if elapsed > 0 {
                            let processedSize = files.prefix(totalProcessed).reduce(Int64(0)) { total, url in
                                let size = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int64) ?? 0
                                return total + size
                            }
                            appState.uploadSpeed = Double(processedSize) / elapsed
                        }
                    }
                }
            }
        }

        // Finalize
        await MainActor.run {
            appState.isUploading = false
            appState.uploadProgress = 1.0
            appState.currentFileName = ""

            if isCancelled {
                appState.error = "Caricamento annullato"
                appState.addRecentUpload(count: successCount, success: false)
                NotificationService.shared.showUploadCancelled(uploadedCount: successCount)
            } else if failureCount > 0 {
                appState.error = "\(failureCount) file non caricati"
                appState.addRecentUpload(count: successCount, success: false)
                NotificationService.shared.showUploadError(
                    message: "\(successCount) caricati, \(failureCount) falliti"
                )
            } else {
                appState.error = nil
                appState.addRecentUpload(count: successCount, success: true)
                NotificationService.shared.showUploadComplete(count: successCount)

                // Auto-eject if enabled
                if appState.autoEject, let volumeName = appState.detectedVolume {
                    let watcher = VolumeWatcher()
                    watcher.ejectVolume(named: volumeName)
                }
            }

            appState.resetUploadState()
        }
    }

    // MARK: - Cancel

    func cancelUpload() {
        isCancelled = true
        uploadTask?.cancel()
    }

    // MARK: - Single File Upload

    private func uploadSingleFile(file: URL, serverURL: String, apiKey: String) async -> Bool {
        for attempt in 1...maxRetries {
            do {
                try await performUpload(file: file, serverURL: serverURL, apiKey: apiKey)
                return true
            } catch {
                print("[UploadService] Tentativo \(attempt)/\(maxRetries) fallito per \(file.lastPathComponent): \(error)")
                if attempt < maxRetries {
                    // Exponential backoff
                    try? await Task.sleep(nanoseconds: UInt64(pow(2.0, Double(attempt))) * 1_000_000_000)
                }
            }
        }
        return false
    }

    private func performUpload(file: URL, serverURL: String, apiKey: String) async throws {
        let url = buildURL(serverURL: serverURL, path: "/api/v1/slides/upload/incoming")
        let boundary = UUID().uuidString

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        request.setValue(apiKey, forHTTPHeaderField: "X-Api-Key")
        request.timeoutInterval = 120

        // Read file data
        let fileData = try Data(contentsOf: file)
        let fileName = file.lastPathComponent

        // Build multipart body
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"files\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        let session = makeURLSession()
        let (data, response) = try await session.upload(for: request, from: body)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw UploadError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let responseBody = String(data: data, encoding: .utf8) ?? "N/A"
            throw UploadError.serverError(statusCode: httpResponse.statusCode, message: responseBody)
        }

        // Parse response
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let success = json["success"] as? Bool, !success {
            let message = json["message"] as? String ?? "Errore sconosciuto"
            throw UploadError.uploadFailed(message: message)
        }
    }

    // MARK: - Helpers

    private func buildURL(serverURL: String, path: String) -> URL {
        var base = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
        if base.hasSuffix("/") {
            base = String(base.dropLast())
        }
        return URL(string: base + path)!
    }

    private func makeURLSession() -> URLSession {
        let config = URLSessionConfiguration.default
        config.waitsForConnectivity = true
        config.timeoutIntervalForResource = 300

        // Allow self-signed certificates for development
        let delegate = InsecureSessionDelegate()
        return URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
    }
}

// MARK: - Errors

enum UploadError: LocalizedError {
    case invalidResponse
    case serverError(statusCode: Int, message: String)
    case uploadFailed(message: String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Risposta non valida dal server."
        case .serverError(let code, let message):
            return "Errore del server (\(code)): \(message)"
        case .uploadFailed(let message):
            return "Caricamento fallito: \(message)"
        }
    }
}

// MARK: - URLSession Delegate for Self-Signed Certs

final class InsecureSessionDelegate: NSObject, URLSessionDelegate {
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        // Accept self-signed certificates (for development/self-hosted VPS)
        if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
           let serverTrust = challenge.protectionSpace.serverTrust {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
        } else {
            completionHandler(.performDefaultHandling, nil)
        }
    }
}
