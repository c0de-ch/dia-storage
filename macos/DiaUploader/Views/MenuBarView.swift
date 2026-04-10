import SwiftUI

struct MenuBarView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var volumeWatcher: VolumeWatcher
    @EnvironmentObject var uploadService: UploadService

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            headerView

            Divider()

            // Main content area
            if appState.isUploading {
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
            HStack {
                Image(systemName: "sdcard.fill")
                    .foregroundColor(.blue)
                Text("Scheda SD rilevata")
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            Text("Trovate \(appState.detectedFiles.count) diapositive su \"\(volume)\"")
                .font(.caption)
                .foregroundColor(.secondary)

            Text("Dimensione totale: \(appState.formattedTotalSize)")
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
                .padding(.top, 4)
            }

            Button(action: startUpload) {
                HStack {
                    Image(systemName: "arrow.up.circle.fill")
                    Text("Carica diapositive")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(!appState.isConnected)
            .padding(.top, 4)
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

    // MARK: - Actions

    private func startUpload() {
        Task {
            await uploadService.uploadFiles(
                files: appState.detectedFiles,
                appState: appState
            )
        }
    }

    private func openSettings() {
        // Activate the app first — essential for MenuBarExtra apps
        NSApp.activate(ignoringOtherApps: true)
        // showSettingsWindow: available since macOS 13
        NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
    }
}
