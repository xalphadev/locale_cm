import 'package:flutter/material.dart';
import 'package:shell/shell.dart';

// Override at build/run time: --dart-define=BASE_URL=https://merchant.locale.example
// Default points at the local Next.js merchant dev server (port 3002), reachable
// from the iOS simulator via localhost. Opens straight into the merchant portal.
const _baseUrl = String.fromEnvironment('BASE_URL', defaultValue: 'http://localhost:3002/merchant');

void main() {
  runApp(
    const LocaleApp(
      config: AppConfig(
        title: 'Locale ร้านค้า',
        baseUrl: _baseUrl,
        seed: Color(0xFF2B74FF), // merchant accent (--m-accent)
      ),
    ),
  );
}
