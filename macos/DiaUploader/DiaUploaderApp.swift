import SwiftUI

@main
struct DiaUploaderApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var volumeWatcher = VolumeWatcher()
    @StateObject private var uploadService = UploadService()
    @State private var hasInitialized = false

    init() {
        // Wire up after all @StateObject are initialized
    }

    var body: some Scene {
        MenuBarExtra {
            MenuBarView()
                .environmentObject(appState)
                .environmentObject(volumeWatcher)
                .environmentObject(uploadService)
                .task {
                    guard !hasInitialized else { return }
                    hasInitialized = true
                    setupVolumeWatcher()

                    if !appState.needsSetup {
                        await checkInitialConnection()
                    }
                }
        } label: {
            let icon = appState.isUploading ? "MenuBarIconUploading" : "MenuBarIcon"
            Image(icon)
                .renderingMode(.template)
        }
        .menuBarExtraStyle(.window)
        .handlesExternalEvents(matching: ["dia-uploader"])

        Window("Impostazioni", id: "settings") {
            SettingsView()
                .environmentObject(appState)
                .environmentObject(uploadService)
        }
        .windowResizability(.contentSize)
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

    private func checkInitialConnection() async {
        guard !appState.serverURL.isEmpty, !appState.apiKey.isEmpty else { return }
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
