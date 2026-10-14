package com.shreebeautystudio.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // 1. Ensure the window does NOT lay out content behind the system status bar
        WindowCompat.setDecorFitsSystemWindows(window, true);

        // 2. Configure system bars background colors
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.setStatusBarColor(Color.parseColor("#032B30"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            window.setNavigationBarColor(Color.parseColor("#011215"));
        }

        // 3. Status bar icons should be light (white) on dark #032B30 background
        WindowInsetsControllerCompat insetsController =
            WindowCompat.getInsetsController(window, window.getDecorView());
        if (insetsController != null) {
            insetsController.setAppearanceLightStatusBars(false); // White icons
            insetsController.setAppearanceLightNavigationBars(false);
        }

        // 4. Default cutout mode: cutout is naturally part of the system status bar,
        // so content starts below the status bar with zero letterboxing or weird spaces
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = window.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_DEFAULT;
            window.setAttributes(lp);
        }

        // 5. Apply dynamic system bar fitting directly to the Capacitor WebView
        // so that the mobile topbar (status bar: battery, charging, wifi, clock)
        // never overlaps the app header and every button is 100% clickable.
        setupDynamicSystemBarInsets();
    }

    private void setupDynamicSystemBarInsets() {
        Window window = getWindow();
        View decorView = window.getDecorView();

        ViewCompat.setOnApplyWindowInsetsListener(decorView, (v, windowInsets) -> {
            Insets statusInsets = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
            Insets navInsets = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars());

            int topInset = statusInsets.top > 0 ? statusInsets.top : getFallbackStatusBarHeight();
            int bottomInset = navInsets.bottom;

            applyWebViewMargins(topInset, bottomInset);
            return windowInsets;
        });

        // Trigger on layout queue to ensure initial measurement handles all aspect ratios
        decorView.post(() -> {
            int topInset = getFallbackStatusBarHeight();
            int bottomInset = 0;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && decorView.getRootWindowInsets() != null) {
                WindowInsetsCompat insets = WindowInsetsCompat.toWindowInsetsCompat(decorView.getRootWindowInsets());
                int dynamicTop = insets.getInsets(WindowInsetsCompat.Type.statusBars()).top;
                if (dynamicTop > 0) topInset = dynamicTop;
                bottomInset = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
            }
            applyWebViewMargins(topInset, bottomInset);
        });
    }

    private void applyWebViewMargins(int topInset, int bottomInset) {
        View webView = bridge != null ? bridge.getWebView() : findViewById(com.getcapacitor.android.R.id.webview);
        if (webView != null) {
            ViewGroup.LayoutParams rawLp = webView.getLayoutParams();
            if (rawLp instanceof ViewGroup.MarginLayoutParams) {
                ViewGroup.MarginLayoutParams lp = (ViewGroup.MarginLayoutParams) rawLp;
                if (lp.topMargin != topInset || lp.bottomMargin != bottomInset) {
                    lp.topMargin = topInset;
                    lp.bottomMargin = bottomInset;
                    webView.setLayoutParams(lp);
                }
            } else {
                webView.setPadding(0, topInset, 0, bottomInset);
            }
        }
    }

    private int getFallbackStatusBarHeight() {
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        return resourceId > 0 ? getResources().getDimensionPixelSize(resourceId) : 0;
    }
}
