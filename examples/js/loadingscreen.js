function hideLoadingScreenWhenReady(view, loadingScreen) {
    // auto-hide in 3 sec or if view is loaded
    const hideLoader = function _() {
        if (!loadingScreen) {
            return;
        }
        loadingScreen.className += 'invisible';

        loadingScreen.addEventListener('transitionend', function _(e) {
            viewerDiv.removeChild(e.target);
        });
        loadingScreen = null;
        view.mainLoop.removeEventListener(hideLoader);
    };
    view.mainLoop.addEventListener('command-queue-empty', hideLoader);
    setTimeout(hideLoader, 3000);
}
