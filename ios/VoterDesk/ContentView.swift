import SwiftUI
import WebKit

struct ContentView: View {
    @State private var isLoading: Bool = true
    @State private var estimatedProgress: Double = 0.0
    @State private var hasError: Bool = false
    private let targetURL = URL(string: "https://voterdeskproject.vercel.app")!

    var body: some View {
        ZStack(alignment: .top) {
            Color(red: 18/255, green: 72/255, blue: 165/255)
                .edgesIgnoringSafeArea(.all)

            if hasError {
                VStack(spacing: 20) {
                    Image(systemName: "wifi.slash")
                        .font(.system(size: 60))
                        .foregroundColor(.white)
                    Text("कोई इंटरनेट कनेक्शन नहीं है")
                        .font(.title2.bold())
                        .foregroundColor(.white)
                    Text("कृपया अपना वाई-फ़ाई या मोबाइल डेटा चेक करें।")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                    Button(action: {
                        hasError = false
                        isLoading = true
                    }) {
                        Text("पुनः प्रयास करें (Retry)")
                            .font(.headline)
                            .foregroundColor(Color(red: 18/255, green: 72/255, blue: 165/255))
                            .padding(.horizontal, 28)
                            .padding(.vertical, 14)
                            .background(Color.white)
                            .cornerRadius(14)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                iOSWebView(url: targetURL, isLoading: $isLoading, progress: $estimatedProgress, hasError: $hasError)
                    .edgesIgnoringSafeArea(.bottom)

                if isLoading && estimatedProgress < 1.0 {
                    ProgressView(value: estimatedProgress, total: 1.0)
                        .progressViewStyle(LinearProgressViewStyle(tint: Color.orange))
                        .frame(height: 3)
                        .padding(.top, 44)
                }
            }
        }
    }
}

struct iOSWebView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    @Binding var progress: Double
    @Binding var hasError: Bool

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.preferences.javaScriptCanOpenWindowsAutomatically = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.scrollView.bounces = true
        webView.allowsBackForwardNavigationGestures = true
        webView.customUserAgent = "VoterDeskMobileApp/1.0 iOS"

        context.coordinator.setupProgressObserver(for: webView)
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        var parent: iOSWebView
        private var progressObservation: NSKeyValueObservation?

        init(_ parent: iOSWebView) {
            self.parent = parent
        }

        func setupProgressObserver(for webView: WKWebView) {
            progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] webView, _ in
                DispatchQueue.main.async {
                    self?.parent.progress = webView.estimatedProgress
                }
            }
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.isLoading = true
                self.parent.hasError = false
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
            }
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
                self.parent.hasError = true
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            let scheme = url.scheme?.lowercased() ?? ""
            let urlString = url.absoluteString

            // WhatsApp, Phone, Mail, Maps
            if scheme == "tel" || scheme == "mailto" || scheme == "whatsapp" || urlString.contains("wa.me") || urlString.contains("api.whatsapp.com") {
                if UIApplication.shared.canOpenURL(url) {
                    UIApplication.shared.open(url)
                    decisionHandler(.cancel)
                    return
                }
            }

            decisionHandler(.allow)
        }
    }
}
