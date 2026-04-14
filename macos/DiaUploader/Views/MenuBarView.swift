import SwiftUI

struct MenuBarView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var volumeWatcher: VolumeWatcher
    @EnvironmentObject var uploadService: UploadService
    @Environment(\.openWindow) private var openWindow

    @State private var selectedFiles: Set<URL> = []
    @State private var showCompletion = false
    @State private var lastUploadCount = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            headerView

            Divider()

            // Main content area
            if showCompletion {
                completionView
            } else if appState.isUploading {
                UploadProgressView()
                    .environmentObject(appState)
                    .environmentObject(uploadService)
            } else if let volume = appState.detectedVolume, !appState.detectedFiles.isEmpty {
                sdCardDetectedView(volume: volume)
            } else {
                idleView
            }

            Divider()

            // Recent uploads
            if !appState.recentUploads.isEmpty {
                recentUploadsView
                Divider()
            }

            // Footer
            footerView
        }
        .padding(16)
        .frame(width: 320)
        .onAppear {
            if appState.needsSetup {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    openSettings()
                }
            }
        }
        .onChange(of: appState.detectedFiles) { _, newFiles in
            selectedFiles = Set(newFiles)
        }
        .onChange(of: appState.isUploading) { oldValue, newValue in
            if oldValue && !newValue {
                // Upload just finished
                if let lastUpload = appState.recentUploads.first, lastUpload.success {
                    lastUploadCount = lastUpload.count
                    showCompletion = true
                }
            }
        }
    }

    // MARK: - Header

    private var headerView: some View {
        HStack {
            Image(systemName: "film")
                .font(.title2)
                .foregroundColor(.accentColor)

            Text("Dia-Uploader")
                .font(.headline)

            Spacer()

            // Connection status
            HStack(spacing: 4) {
                Circle()
                    .fill(appState.isConnected ? Color.green : Color.red)
                    .frame(width: 8, height: 8)
                Text(appState.isConnected ? "Connesso" : "Disconnesso")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }

    // MARK: - SD Card Detected

    private func sdCardDetectedView(volume: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Image(systemName: "sdcard.fill")
                    .foregroundColor(.blue)
                Text("Scheda SD rilevata")
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            Text("\(appState.detectedFiles.count) diapositive su \"\(volume)\" — \(appState.formattedTotalSize)")
                .font(.caption)
                .foregroundColor(.secondary)

            if !appState.isConnected {
                HStack(spacing: 4) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                        .font(.caption)
                    Text("Server non raggiungibile. Configura la connessione nelle impostazioni.")
                        .font(.caption)
                        .foregroundColor(.orange)
                }
            }

            Divider()

            // Select all toggle
            HStack {
                Button(action: toggleSelectAll) {
                    HStack(spacing: 4) {
                        Image(systemName: selectedFiles.count == appState.detectedFiles.count ? "checkmark.square.fill" : "square")
                            .foregroundColor(.accentColor)
                        Text(selectedFiles.count == appState.detectedFiles.count ? "Deseleziona tutti" : "Seleziona tutti")
                            .font(.caption)
                    }
                }
                .buttonStyle(.plain)

                Spacer()

                Text("\(selectedFiles.count) di \(appState.detectedFiles.count) selezionate")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            // File list (scrollable, max ~200px height)
            ScrollView {
                VStack(spacing: 2) {
                    ForEach(appState.detectedFiles, id: \.self) { file in
                        FileRow(file: file, isSelected: selectedFiles.contains(file), onToggle: { toggleFile(file) })
                    }
                }
            }
            .frame(maxHeight: 200)

            // Upload button
            Button(action: startUpload) {
                HStack {
                    Image(systemName: "arrow.up.circle.fill")
                    Text("Carica \(selectedFiles.count) diapositive")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(!appState.isConnected || selectedFiles.isEmpty)
        }
    }

    // MARK: - Idle State

    private var idleView: some View {
        VStack(spacing: 8) {
            Image(systemName: "sdcard")
                .font(.largeTitle)
                .foregroundColor(.secondary)

            Text("In attesa della scheda SD...")
                .font(.subheadline)
                .foregroundColor(.secondary)

            Text("Inserisci una scheda SD con diapositive scansionate.")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
    }

    // MARK: - Recent Uploads

    private var recentUploadsView: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Caricamenti recenti")
                .font(.caption)
                .foregroundColor(.secondary)
                .fontWeight(.medium)

            ForEach(appState.recentUploads.prefix(5)) { upload in
                HStack {
                    Image(systemName: upload.success ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .foregroundColor(upload.success ? .green : .red)
                        .font(.caption)

                    Text("\(upload.count) diapositive")
                        .font(.caption)

                    Spacer()

                    Text(upload.date, style: .relative)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
    }

    // MARK: - Footer

    private var footerView: some View {
        HStack {
            Button(action: openSettings) {
                Label("Impostazioni", systemImage: "gear")
            }
            .buttonStyle(.plain)
            .font(.caption)

            Spacer()

            if let error = appState.error {
                Text(error)
                    .font(.caption2)
                    .foregroundColor(.red)
                    .lineLimit(1)

                Spacer()
            }

            Button(action: {
                NSApplication.shared.terminate(nil)
            }) {
                Label("Esci", systemImage: "power")
            }
            .buttonStyle(.plain)
            .font(.caption)
        }
    }

    // MARK: - Completion View

    private var completionView: some View {
        VStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .font(.largeTitle)
                .foregroundColor(.green)

            Text("Caricamento completato")
                .font(.subheadline)
                .fontWeight(.medium)

            Text("\(lastUploadCount) diapositive caricate")
                .font(.caption)
                .foregroundColor(.secondary)

            HStack(spacing: 8) {
                Button("Apri coda") {
                    if let url = URL(string: appState.serverURL + "/coda") {
                        NSWorkspace.shared.open(url)
                    }
                    showCompletion = false
                }
                .buttonStyle(.borderedProminent)

                Button("Chiudi") {
                    showCompletion = false
                }
                .buttonStyle(.bordered)
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }

    // MARK: - Actions

    private func startUpload() {
        let filesToUpload = Array(selectedFiles).sorted { $0.lastPathComponent < $1.lastPathComponent }
        Task {
            await uploadService.uploadFiles(
                files: filesToUpload,
                appState: appState
            )
        }
    }

    private func toggleSelectAll() {
        if selectedFiles.count == appState.detectedFiles.count {
            selectedFiles.removeAll()
        } else {
            selectedFiles = Set(appState.detectedFiles)
        }
    }

    private func toggleFile(_ file: URL) {
        if selectedFiles.contains(file) {
            selectedFiles.remove(file)
        } else {
            selectedFiles.insert(file)
        }
    }

    private func openSettings() {
        NSApp.activate(ignoringOtherApps: true)
        openWindow(id: "settings")
    }
}

// MARK: - File Row

private struct FileRow: View {
    let file: URL
    let isSelected: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 6) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isSelected ? .accentColor : .secondary)
                    .font(.caption)

                Text(file.lastPathComponent)
                    .font(.caption)
                    .lineLimit(1)
                    .truncationMode(.middle)

                Spacer()

                Text(fileSizeString(file))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.vertical, 2)
            .padding(.horizontal, 4)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func fileSizeString(_ url: URL) -> String {
        let size = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int64) ?? 0
        return ByteCountFormatter.string(fromByteCount: size, countStyle: .file)
    }
}
