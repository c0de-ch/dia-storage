import Foundation
import Combine

struct RecentUpload: Identifiable, Codable {
    let id: UUID
    let date: Date
    let count: Int
    let success: Bool

    init(date: Date, count: Int, success: Bool) {
        self.id = UUID()
        self.date = date
        self.count = count
        self.success = success
    }
}

final class AppState: ObservableObject {
    // MARK: - Server Configuration

    @Published var serverURL: String {
        didSet { UserDefaults.standard.set(serverURL, forKey: "serverURL") }
    }

    @Published var apiKey: String = ""

    // MARK: - Connection State

    @Published var isConnected: Bool = false
    @Published var isCheckingConnection: Bool = false
    @Published var connectionError: String?

    // MARK: - Upload State

    @Published var isUploading: Bool = false
    @Published var uploadProgress: Double = 0.0
    @Published var uploadedCount: Int = 0
    @Published var totalCount: Int = 0
    @Published var currentFileName: String = ""
    @Published var uploadSpeed: Double = 0.0 // bytes per second

    // MARK: - Volume Detection

    @Published var detectedVolume: String?
    @Published var detectedVolumeURL: URL?
    @Published var detectedFiles: [URL] = []
    @Published var totalFileSize: Int64 = 0

    // MARK: - Error

    @Published var error: String?

    // MARK: - Settings

    @Published var autoEject: Bool {
        didSet { UserDefaults.standard.set(autoEject, forKey: "autoEject") }
    }

    @Published var autoUpload: Bool {
        didSet { UserDefaults.standard.set(autoUpload, forKey: "autoUpload") }
    }

    // MARK: - History

    @Published var recentUploads: [RecentUpload] = [] {
        didSet {
            if let data = try? JSONEncoder().encode(recentUploads) {
                UserDefaults.standard.set(data, forKey: "recentUploads")
            }
        }
    }

    // MARK: - Initialization

    init() {
        self.serverURL = UserDefaults.standard.string(forKey: "serverURL") ?? ""
        self.autoEject = UserDefaults.standard.bool(forKey: "autoEject")
        self.autoUpload = UserDefaults.standard.bool(forKey: "autoUpload")

        // Load API key from Keychain
        if let savedURL = UserDefaults.standard.string(forKey: "serverURL"),
           !savedURL.isEmpty,
           let savedKey = KeychainService.load(forServer: savedURL) {
            self.apiKey = savedKey
        }

        // Load recent uploads
        if let data = UserDefaults.standard.data(forKey: "recentUploads"),
           let uploads = try? JSONDecoder().decode([RecentUpload].self, from: data) {
            self.recentUploads = uploads
        }
    }

    /// True when the app has never been configured (first launch).
    var needsSetup: Bool {
        serverURL.isEmpty || apiKey.isEmpty
    }

    // MARK: - Methods

    func addRecentUpload(count: Int, success: Bool) {
        let upload = RecentUpload(date: Date(), count: count, success: success)
        recentUploads.insert(upload, at: 0)
        if recentUploads.count > 10 {
            recentUploads = Array(recentUploads.prefix(10))
        }
    }

    func resetUploadState() {
        isUploading = false
        uploadProgress = 0.0
        uploadedCount = 0
        totalCount = 0
        currentFileName = ""
        uploadSpeed = 0.0
    }

    func clearDetectedVolume() {
        detectedVolume = nil
        detectedVolumeURL = nil
        detectedFiles = []
        totalFileSize = 0
    }

    var formattedTotalSize: String {
        ByteCountFormatter.string(fromByteCount: totalFileSize, countStyle: .file)
    }

    var estimatedTimeRemaining: String {
        guard uploadSpeed > 0, totalCount > 0 else { return "--" }
        let remainingFiles = totalCount - uploadedCount
        guard remainingFiles > 0 else { return "0s" }

        // Estimate based on average file size and speed
        let avgFileSize = Double(totalFileSize) / Double(totalCount)
        let remainingBytes = avgFileSize * Double(remainingFiles)
        let remainingSeconds = remainingBytes / uploadSpeed

        if remainingSeconds < 60 {
            return String(format: "%.0fs", remainingSeconds)
        } else if remainingSeconds < 3600 {
            return String(format: "%.0fm %.0fs", remainingSeconds / 60, remainingSeconds.truncatingRemainder(dividingBy: 60))
        } else {
            return String(format: "%.0fh %.0fm", remainingSeconds / 3600, (remainingSeconds / 60).truncatingRemainder(dividingBy: 60))
        }
    }

    var formattedUploadSpeed: String {
        if uploadSpeed <= 0 { return "--" }
        let mbps = uploadSpeed / (1024 * 1024)
        return String(format: "%.1f MB/s", mbps)
    }
}
