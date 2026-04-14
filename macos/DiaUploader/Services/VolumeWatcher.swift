import Foundation
import AppKit
import Combine

final class VolumeWatcher: ObservableObject {
    private var cancellables = Set<AnyCancellable>()

    // Reference to app state, set externally
    weak var appState: AppState?
    var onVolumeDetected: ((_ volumeName: String, _ files: [URL], _ totalSize: Int64) -> Void)?

    init() {
        startWatching()
    }

    deinit {
        stopWatching()
    }

    // MARK: - Volume Monitoring

    func startWatching() {
        let center = NSWorkspace.shared.notificationCenter

        center.publisher(for: NSWorkspace.didMountNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] notification in
                self?.handleVolumeMount(notification)
            }
            .store(in: &cancellables)

        center.publisher(for: NSWorkspace.didUnmountNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] notification in
                self?.handleVolumeUnmount(notification)
            }
            .store(in: &cancellables)

        // Check already-mounted volumes on startup
        checkExistingVolumes()
    }

    func stopWatching() {
        cancellables.removeAll()
    }

    // MARK: - Handlers

    private func handleVolumeMount(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let volumeURL = userInfo[NSWorkspace.volumeURLUserInfoKey] as? URL else {
            return
        }

        let volumeName = volumeURL.lastPathComponent
        print("[VolumeWatcher] Volume montato: \(volumeName) a \(volumeURL.path)")

        // Check in background to avoid blocking main thread
        Task {
            await scanVolume(at: volumeURL)
        }
    }

    private func handleVolumeUnmount(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let volumeURL = userInfo[NSWorkspace.volumeURLUserInfoKey] as? URL else {
            return
        }

        let volumeName = volumeURL.lastPathComponent
        print("[VolumeWatcher] Volume smontato: \(volumeName)")

        DispatchQueue.main.async { [weak self] in
            self?.appState?.clearDetectedVolume()
        }
    }

    // MARK: - Volume Scanning

    func checkExistingVolumes() {
        let volumeURLs = FileManager.default.mountedVolumeURLs(
            includingResourceValuesForKeys: [.volumeIsRemovableKey, .volumeNameKey],
            options: [.skipHiddenVolumes]
        ) ?? []

        for url in volumeURLs {
            Task {
                await scanVolume(at: url)
            }
        }
    }

    private func scanVolume(at volumeURL: URL) async {
        // Check if volume is removable (SD cards, USB drives)
        guard isRemovableVolume(at: volumeURL) else { return }

        let volumeName = volumeURL.lastPathComponent
        let scanner = FileScanner()
        let (files, totalSize) = scanner.scanForSlides(at: volumeURL)

        await MainActor.run {
            appState?.detectedVolume = volumeName
            appState?.detectedVolumeURL = volumeURL
            appState?.detectedFiles = files
            appState?.totalFileSize = totalSize

            if !files.isEmpty {
                onVolumeDetected?(volumeName, files, totalSize)
            }

            // Send notification
            NotificationService.shared.showSDCardDetected(
                volumeName: volumeName,
                fileCount: files.count
            )
        }
    }

    private func isRemovableVolume(at url: URL) -> Bool {
        do {
            let resourceValues = try url.resourceValues(forKeys: [
                .volumeIsRemovableKey,
                .volumeIsEjectableKey,
                .volumeIsLocalKey
            ])

            let isRemovable = resourceValues.volumeIsRemovable ?? false
            let isEjectable = resourceValues.volumeIsEjectable ?? false
            let isLocal = resourceValues.volumeIsLocal ?? false

            return (isRemovable || isEjectable) && isLocal
        } catch {
            print("[VolumeWatcher] Errore nel controllo del volume: \(error)")
            return false
        }
    }

    // MARK: - Eject

    func ejectVolume(named volumeName: String) {
        let volumeURL = URL(fileURLWithPath: "/Volumes/\(volumeName)")

        Task {
            do {
                try await NSWorkspace.shared.unmountAndEjectDevice(at: volumeURL)
                print("[VolumeWatcher] Volume espulso con successo: \(volumeName)")
            } catch {
                print("[VolumeWatcher] Errore nell'espulsione del volume: \(error)")
                await MainActor.run { [weak self] in
                    self?.appState?.error = "Errore nell'espulsione della scheda SD: \(error.localizedDescription)"
                }
            }
        }
    }
}
