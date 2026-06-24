import Flutter
import UIKit
import ObjectiveC

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    removeWebViewInputAccessoryBar()
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  /// WKWebView shows a native prev/next/Done toolbar above the keyboard whenever a web
  /// <input>/<textarea> gets focus. There is no public API to hide it, so override
  /// `inputAccessoryView` on the private WKContentView class to return nil app-wide.
  /// The page still blurs the field when the user taps elsewhere, so nothing is lost.
  private func removeWebViewInputAccessoryBar() {
    guard let cls = NSClassFromString("WKContentView") else { return }
    let sel = NSSelectorFromString("inputAccessoryView")
    let block: @convention(block) (AnyObject) -> UIView? = { _ in nil }
    let imp = imp_implementationWithBlock(block)
    if let method = class_getInstanceMethod(cls, sel) {
      method_setImplementation(method, imp)
    } else {
      class_addMethod(cls, sel, imp, "@@:")
    }
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
  }
}
