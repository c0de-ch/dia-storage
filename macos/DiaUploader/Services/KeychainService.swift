import Foundation
import Security

enum KeychainService {
    private static let serviceName = "ch.c0de.dia-uploader"

    // MARK: - Save

    @discardableResult
    static func save(key: String, forServer server: String) -> Bool {
        guard let keyData = key.data(using: .utf8) else { return false }

        // Delete existing item first
        delete(forServer: server)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: server,
            kSecValueData as String: keyData,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlocked
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        if status != errSecSuccess {
            print("[KeychainService] Errore nel salvataggio della chiave: \(status)")
        }

        return status == errSecSuccess
    }

    // MARK: - Load

    static func load(forServer server: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: server,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let key = String(data: data, encoding: .utf8) else {
            if status != errSecItemNotFound {
                print("[KeychainService] Errore nel recupero della chiave: \(status)")
            }
            return nil
        }

        return key
    }

    // MARK: - Delete

    @discardableResult
    static func delete(forServer server: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: server
        ]

        let status = SecItemDelete(query as CFDictionary)

        if status != errSecSuccess && status != errSecItemNotFound {
            print("[KeychainService] Errore nella rimozione della chiave: \(status)")
        }

        return status == errSecSuccess || status == errSecItemNotFound
    }
}
