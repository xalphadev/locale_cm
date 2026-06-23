import 'package:flutter/material.dart';
import 'package:shell/shell.dart';

// Override at build/run time: --dart-define=BASE_URL=https://app.locale.example
// Default points at the local Next.js consumer dev server (port 3003), reachable
// from the iOS simulator via localhost.
const _baseUrl = String.fromEnvironment('BASE_URL', defaultValue: 'http://localhost:3003');

void main() {
  runApp(
    const LocaleApp(
      config: AppConfig(
        title: 'Locale',
        baseUrl: _baseUrl,
        seed: Color(0xFF2B74FF), // consumer accent (--accent)
      ),
    ),
  );
}
