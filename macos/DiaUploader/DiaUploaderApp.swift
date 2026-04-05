import SwiftUI

@main
struct DiaUploaderApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var volumeWatcher = VolumeWatcher()
    @StateObject private var uploadService = UploadService()

    init() {
        // Wire up after all @StateObject are initialized
    }

    var body: some Scene {
        MenuBarExtra {
            MenuBarView()
                .environmentObject(appState)
                .environmentObject(volumeWatcher)
                .environmentObject(uploadService)
                .onAppear {
                    setupVolumeWatcher()
                    checkInitialConnection()
                }
        } label: {
            Label("Dia-Uploader", systemImage: appState.isUploading ? "arrow.up.circle.fill" : "film")
        }
        .menuBarExtraStyle(.window)

        Settings {
            SettingsView()
                .environmentObject(appState)
                .environmentObject(uploadService)
        }
    }

    // MARK: - Setup

    private func setupVolumeWatcher() {
        let state = appState
        let uploader = uploadService
        volumeWatcher.appState = state
        volumeWatcher.onVolumeDetected = { volumeName, files, totalSize in
            if state.autoUpload && state.isConnected && !state.isUploading {
                Task {
                    await uploader.uploadFiles(files: files, appState: state)
                }
            }
        }
        // Re-scan in case volumes were mounted before wiring
        volumeWatcher.checkExistingVolumes()
    }

    private func checkInitialConnection() {
        guard !appState.serverURL.isEmpty, !appState.apiKey.isEmpty else { return }
        Task {
            do {
                let connected = try await uploadService.testConnection(
                    serverURL: appState.serverURL,
                    apiKey: appState.apiKey
                )
                await MainActor.run {
                    appState.isConnected = connected
                }
            } catch {
                await MainActor.run {
                    appState.isConnected = false
                }
            }
        }
    }
}
