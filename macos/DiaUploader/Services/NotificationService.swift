import Foundation
import UserNotifications

final class NotificationService {
    static let shared = NotificationService()

    private init() {
        requestPermission()
    }

    // MARK: - Permission

    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .sound, .badge]
        ) { granted, error in
            if let error = error {
                print("[NotificationService] Errore nella richiesta di permesso: \(error)")
            }
            print("[NotificationService] Permesso notifiche: \(granted ? "concesso" : "negato")")
        }
    }

    // MARK: - SD Card Detection

    func showSDCardDetected(volumeName: String, fileCount: Int) {
        let content = UNMutableNotificationContent()
        content.title = "Scheda SD rilevata"
        content.body = "Trovate \(fileCount) diapositive su \"\(volumeName)\""
        content.sound = .default
        content.categoryIdentifier = "SD_CARD_DETECTED"

        sendNotification(identifier: "sd-detected-\(volumeName)", content: content)
    }

    // MARK: - Upload Complete

    func showUploadComplete(count: Int) {
        let content = UNMutableNotificationContent()
        content.title = "Caricamento completato"
        content.body = "\(count) diapositive caricate con successo."
        content.sound = .default
        content.categoryIdentifier = "UPLOAD_COMPLETE"

        sendNotification(identifier: "upload-complete-\(Date().timeIntervalSince1970)", content: content)
    }

    // MARK: - Upload Error

    func showUploadError(message: String) {
        let content = UNMutableNotificationContent()
        content.title = "Errore di caricamento"
        content.body = message
        content.sound = .defaultCritical
        content.categoryIdentifier = "UPLOAD_ERROR"

        sendNotification(identifier: "upload-error-\(Date().timeIntervalSince1970)", content: content)
    }

    // MARK: - Upload Cancelled

    func showUploadCancelled(uploadedCount: Int) {
        let content = UNMutableNotificationContent()
        content.title = "Caricamento annullato"
        content.body = "\(uploadedCount) diapositive caricate prima dell'annullamento."
        content.sound = .default
        content.categoryIdentifier = "UPLOAD_CANCELLED"

        sendNotification(identifier: "upload-cancelled-\(Date().timeIntervalSince1970)", content: content)
    }

    // MARK: - Private

    private func sendNotification(identifier: String, content: UNMutableNotificationContent) {
        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: nil // Deliver immediately
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[NotificationService] Errore nell'invio della notifica: \(error)")
            }
        }
    }
}
