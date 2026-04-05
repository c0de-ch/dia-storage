import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var uploadService: UploadService

    @State private var serverURL: String = ""
    @State private var apiKey: String = ""
    @State private var showApiKey: Bool = false
    @State private var isTesting: Bool = false
    @State private var testResult: TestResult?
    @State private var autoEject: Bool = false
    @State private var autoUpload: Bool = false

    enum TestResult {
        case success(String)
        case failure(String)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Impostazioni")
                .font(.title2)
                .fontWeight(.bold)

            // Server configuration
            GroupBox(label: Label("Connessione al server", systemImage: "network")) {
                VStack(alignment: .leading, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("URL del server")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        TextField("https://dia.example.com", text: $serverURL)
                            .textFieldStyle(.roundedBorder)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Chiave API")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        HStack {
                            if showApiKey {
                                TextField("dia_...", text: $apiKey)
                                    .textFieldStyle(.roundedBorder)
                                    .font(.system(.body, design: .monospaced))
                            } else {
                                SecureField("dia_...", text: $apiKey)
                                    .textFieldStyle(.roundedBorder)
                            }
                            Button(action: { showApiKey.toggle() }) {
                                Image(systemName: showApiKey ? "eye.slash" : "eye")
                            }
                            .buttonStyle(.borderless)
                            .help(showApiKey ? "Nascondi chiave" : "Mostra chiave")
                        }
                    }

                    HStack {
                        Button(action: testConnection) {
                            HStack(spacing: 4) {
                                if isTesting {
                                    ProgressView()
                                        .controlSize(.small)
                                } else {
                                    Image(systemName: "antenna.radiowaves.left.and.right")
                                }
                                Text("Prova connessione")
                            }
                        }
                        .disabled(serverURL.isEmpty || apiKey.isEmpty || isTesting)

                        if let result = testResult {
                            switch result {
                            case .success(let msg):
                                HStack(spacing: 4) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                    Text(msg)
                                        .font(.caption)
                                        .foregroundColor(.green)
                                }
                            case .failure(let msg):
                                HStack(spacing: 4) {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundColor(.red)
                                    Text(msg)
                                        .font(.caption)
                                        .foregroundColor(.red)
                                }
                            }
                        }
                    }
                }
                .padding(8)
            }

            // Behavior settings
            GroupBox(label: Label("Comportamento", systemImage: "gearshape.2")) {
                VStack(alignment: .leading, spacing: 12) {
                    Toggle(isOn: $autoUpload) {
                        VStack(alignment: .leading) {
                            Text("Caricamento automatico")
                            Text("Avvia il caricamento automaticamente quando viene rilevata una scheda SD")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    Toggle(isOn: $autoEject) {
                        VStack(alignment: .leading) {
                            Text("Espelli scheda SD automaticamente")
                            Text("Espelli la scheda SD al termine del caricamento")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding(8)
            }

            Spacer()

            // Save button
            HStack {
                Spacer()
                Button("Salva") {
                    saveSettings()
                }
                .buttonStyle(.borderedProminent)
                .keyboardShortcut(.return, modifiers: .command)
            }
        }
        .padding(20)
        .frame(width: 480, height: 520)
        .onAppear {
            serverURL = appState.serverURL
            apiKey = appState.apiKey
            autoEject = appState.autoEject
            autoUpload = appState.autoUpload
        }
    }

    // MARK: - Actions

    private func saveSettings() {
        appState.serverURL = serverURL
        appState.apiKey = apiKey
        appState.autoEject = autoEject
        appState.autoUpload = autoUpload

        // Save API key to Keychain
        if !serverURL.isEmpty && !apiKey.isEmpty {
            KeychainService.save(key: apiKey, forServer: serverURL)
        }

        // Check connection after saving
        Task {
            await checkConnection()
        }
    }

    private func testConnection() {
        isTesting = true
        testResult = nil

        Task {
            do {
                let healthy = try await uploadService.testConnection(
                    serverURL: serverURL,
                    apiKey: apiKey
                )
                await MainActor.run {
                    if healthy {
                        testResult = .success("Connessione riuscita!")
                    } else {
                        testResult = .failure("Server non raggiungibile")
                    }
                    isTesting = false
                }
            } catch {
                await MainActor.run {
                    testResult = .failure(error.localizedDescription)
                    isTesting = false
                }
            }
        }
    }

    private func checkConnection() async {
        do {
            let healthy = try await uploadService.testConnection(
                serverURL: serverURL,
                apiKey: apiKey
            )
            await MainActor.run {
                appState.isConnected = healthy
            }
        } catch {
            await MainActor.run {
                appState.isConnected = false
            }
        }
    }
}
