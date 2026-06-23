import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

/// Per-app configuration. Each app (consumer / merchant) supplies its own title,
/// base URL, and brand colour; everything else is shared.
class AppConfig {
  final String title;
  final String baseUrl;
  final Color seed;
  const AppConfig({required this.title, required this.baseUrl, required this.seed});
}

/// Root MaterialApp that hosts the WebView shell.
class LocaleApp extends StatelessWidget {
  final AppConfig config;
  const LocaleApp({super.key, required this.config});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: config.title,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: config.seed,
        scaffoldBackgroundColor: Colors.white,
        useMaterial3: true,
      ),
      home: WebShell(config: config),
    );
  }
}

class WebShell extends StatefulWidget {
  final AppConfig config;
  const WebShell({super.key, required this.config});

  @override
  State<WebShell> createState() => _WebShellState();
}

class _WebShellState extends State<WebShell> {
  late final WebViewController _controller;
  late final Uri _base;
  bool _loading = true;
  bool _error = false;

  @override
  void initState() {
    super.initState();
    _base = Uri.parse(widget.config.baseUrl);
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => _set(loading: true, error: false),
          onPageFinished: (_) => _set(loading: false),
          onWebResourceError: (e) {
            // only surface failures for the main document — sub-resource errors (an image,
            // a tracker) must not blank out a page that otherwise rendered fine.
            if (e.isForMainFrame ?? true) _set(loading: false, error: true);
          },
          onNavigationRequest: _onNavigation,
        ),
      )
      ..loadRequest(_base);

    // iOS-specific (WKWebView): native edge-swipe back/forward + wire JS alert()/confirm() to
    // native dialogs. WKWebView suppresses JS dialogs by default, which silently no-ops things
    // like the merchant's "ลบ?" confirm and the share-fallback alert — so they must be handled.
    final platform = _controller.platform;
    if (platform is WebKitWebViewController) {
      platform.setAllowsBackForwardNavigationGestures(true);
      platform.setOnJavaScriptAlertDialog((request) => _showAlert(request.message));
      platform.setOnJavaScriptConfirmDialog((request) => _showConfirm(request.message));
    }
  }

  Future<void> _showAlert(String message) async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        content: Text(message),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('ตกลง'))],
      ),
    );
  }

  Future<bool> _showConfirm(String message) async {
    if (!mounted) return false;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('ยกเลิก')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('ตกลง')),
        ],
      ),
    );
    return ok ?? false;
  }

  void _set({bool? loading, bool? error}) {
    if (!mounted) return;
    setState(() {
      if (loading != null) _loading = loading;
      if (error != null) _error = error;
    });
  }

  /// Keep same-origin navigation inside the WebView; hand everything else
  /// (tel:, mailto:, geo:, LINE, Google Maps, any other domain) to the OS.
  Future<NavigationDecision> _onNavigation(NavigationRequest request) async {
    final uri = Uri.tryParse(request.url);
    if (uri == null) return NavigationDecision.navigate;

    // compare full origin (scheme + host + PORT) — our dev hosts differ only by port
    // (consumer :3003 vs merchant :3002), so a host-only check would wrongly keep the
    // other app's links in-WebView.
    final isWeb = uri.scheme == 'http' || uri.scheme == 'https';
    final sameOrigin = isWeb && uri.hasAuthority && uri.origin == _base.origin;
    if (sameOrigin) return NavigationDecision.navigate;

    // external link / custom scheme → open outside the app
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
    return NavigationDecision.prevent;
  }

  Future<void> _reload() async {
    _set(error: false, loading: true);
    await _controller.loadRequest(_base);
  }

  Future<void> _handleBack(bool didPop) async {
    if (didPop) return;
    if (await _controller.canGoBack()) {
      await _controller.goBack();
    }
    // top of history → stay in the app (iOS has no system back button to honour).
  }

  @override
  Widget build(BuildContext context) {
    // Edge-to-edge: the WebView fills the whole screen (under the status bar and home
    // indicator). The web pages own their safe-area insets via CSS env(safe-area-inset-*)
    // + viewport-fit=cover, so the blue header bleeds to the top and the bottom nav reaches
    // the bottom while their content still clears the notch / home indicator.
    return AnnotatedRegion<SystemUiOverlayStyle>(
      // light header → dark status-bar icons/text
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
        statusBarBrightness: Brightness.light, // iOS
        statusBarIconBrightness: Brightness.dark, // Android
      ),
      child: PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) => _handleBack(didPop),
        child: Scaffold(
          // error view still respects safe area so the retry button isn't under the notch
          body: _error
              ? SafeArea(child: _ErrorView(seed: widget.config.seed, onRetry: _reload))
              : Stack(
                  children: [
                    WebViewWidget(controller: _controller),
                    if (_loading)
                      const Align(
                        alignment: Alignment.topCenter,
                        child: SafeArea(
                          child: LinearProgressIndicator(minHeight: 2.5),
                        ),
                      ),
                  ],
                ),
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final Color seed;
  final VoidCallback onRetry;
  const _ErrorView({required this.seed, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.wifi_off_rounded, size: 46, color: seed),
            const SizedBox(height: 14),
            const Text(
              'เชื่อมต่อไม่ได้',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 6),
            const Text(
              'ตรวจอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 18),
            FilledButton(onPressed: onRetry, child: const Text('ลองใหม่')),
          ],
        ),
      ),
    );
  }
}
