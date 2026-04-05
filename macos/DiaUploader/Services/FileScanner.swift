import Foundation

final class FileScanner {
    /// File name patterns to match (case-insensitive)
    private let patterns: [String] = [
        "PICT",
        "IMG_"
    ]

    /// Allowed file extensions (lowercase)
    private let allowedExtensions: Set<String> = ["jpg", "jpeg", "png", "tiff", "tif", "webp"]

    /// Subdirectories to scan in addition to root
    private let subdirectories: [String] = [
        "DCIM",
        "DCIM/100MEDIA",
        "DCIM/100MSDCF",
        "DCIM/100_PANA",
        "DCIM/100CANON",
        "DCIM/100NIKON",
        "MISC",
        "Pictures",
        "Images"
    ]

    // MARK: - Scanning

    /// Scan a volume for slide images
    /// - Parameter volumeURL: URL of the mounted volume
    /// - Returns: Tuple of (sorted file URLs, total size in bytes)
    func scanForSlides(at volumeURL: URL) -> ([URL], Int64) {
        var foundFiles: [URL] = []
        var scannedDirectories: Set<String> = []

        // Scan root directory
        let rootFiles = scanDirectory(volumeURL, scannedDirectories: &scannedDirectories)
        foundFiles.append(contentsOf: rootFiles)

        // Scan known subdirectories
        for subdir in subdirectories {
            let subdirURL = volumeURL.appendingPathComponent(subdir)
            let files = scanDirectory(subdirURL, scannedDirectories: &scannedDirectories)
            foundFiles.append(contentsOf: files)
        }

        // Also scan any DCIM subdirectory we haven't covered
        let dcimURL = volumeURL.appendingPathComponent("DCIM")
        if FileManager.default.fileExists(atPath: dcimURL.path) {
            scanDCIMSubdirectories(dcimURL, foundFiles: &foundFiles, scannedDirectories: &scannedDirectories)
        }

        // Remove duplicates and sort
        let uniqueFiles = Array(Set(foundFiles)).sorted { $0.lastPathComponent < $1.lastPathComponent }

        // Calculate total size
        let totalSize = uniqueFiles.reduce(Int64(0)) { total, url in
            let size = (try? FileManager.default.attributesOfItem(atPath: url.path)[.size] as? Int64) ?? 0
            return total + size
        }

        print("[FileScanner] Trovati \(uniqueFiles.count) file su \(volumeURL.lastPathComponent) (\(ByteCountFormatter.string(fromByteCount: totalSize, countStyle: .file)))")

        return (uniqueFiles, totalSize)
    }

    // MARK: - Private

    private func scanDirectory(_ directoryURL: URL, scannedDirectories: inout Set<String>) -> [URL] {
        let path = directoryURL.standardizedFileURL.path
        guard !scannedDirectories.contains(path) else { return [] }
        scannedDirectories.insert(path)

        guard FileManager.default.fileExists(atPath: path) else { return [] }

        var results: [URL] = []

        do {
            let contents = try FileManager.default.contentsOfDirectory(
                at: directoryURL,
                includingPropertiesForKeys: [.isRegularFileKey, .fileSizeKey],
                options: [.skipsHiddenFiles, .skipsSubdirectoryDescendants]
            )

            for fileURL in contents {
                if matchesSlidePattern(fileURL) {
                    results.append(fileURL)
                }
            }
        } catch {
            // Directory might not exist or not be readable - this is expected
        }

        return results
    }

    private func scanDCIMSubdirectories(_ dcimURL: URL, foundFiles: inout [URL], scannedDirectories: inout Set<String>) {
        do {
            let subdirs = try FileManager.default.contentsOfDirectory(
                at: dcimURL,
                includingPropertiesForKeys: [.isDirectoryKey],
                options: [.skipsHiddenFiles]
            )

            for subdir in subdirs {
                var isDirectory: ObjCBool = false
                if FileManager.default.fileExists(atPath: subdir.path, isDirectory: &isDirectory),
                   isDirectory.boolValue {
                    let files = scanDirectory(subdir, scannedDirectories: &scannedDirectories)
                    foundFiles.append(contentsOf: files)
                }
            }
        } catch {
            // Ignore errors
        }
    }

    private func matchesSlidePattern(_ fileURL: URL) -> Bool {
        let filename = fileURL.lastPathComponent
        let ext = fileURL.pathExtension.lowercased()

        guard allowedExtensions.contains(ext) else { return false }

        let nameWithoutExt = (filename as NSString).deletingPathExtension.uppercased()

        for pattern in patterns {
            if nameWithoutExt.hasPrefix(pattern) {
                return true
            }
        }

        return false
    }
}
