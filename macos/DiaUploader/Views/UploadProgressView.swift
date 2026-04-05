import SwiftUI

struct UploadProgressView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var uploadService: UploadService

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Title
            HStack {
                Image(systemName: "arrow.up.circle.fill")
                    .foregroundColor(.blue)
                Text("Caricamento in corso")
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            // Progress bar
            VStack(alignment: .leading, spacing: 4) {
                ProgressView(value: appState.uploadProgress, total: 1.0)
                    .progressViewStyle(.linear)

                HStack {
                    Text(String(format: "%.0f%%", appState.uploadProgress * 100))
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.accentColor)

                    Spacer()

                    Text("Caricamento \(appState.uploadedCount) di \(appState.totalCount)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Current file
            if !appState.currentFileName.isEmpty {
                HStack(spacing: 4) {
                    Image(systemName: "doc.fill")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text(appState.currentFileName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
            }

            // Stats
            HStack {
                // Speed
                HStack(spacing: 4) {
                    Image(systemName: "speedometer")
                        .font(.caption2)
                    Text(appState.formattedUploadSpeed)
                        .font(.caption)
                }
                .foregroundColor(.secondary)

                Spacer()

                // Estimated time remaining
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.caption2)
                    Text("Tempo rimanente: \(appState.estimatedTimeRemaining)")
                        .font(.caption)
                }
                .foregroundColor(.secondary)
            }

            // Cancel button
            Button(action: cancelUpload) {
                HStack {
                    Image(systemName: "xmark.circle")
                    Text("Annulla")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .tint(.red)
            .padding(.top, 4)
        }
    }

    private func cancelUpload() {
        uploadService.cancelUpload()
    }
}
