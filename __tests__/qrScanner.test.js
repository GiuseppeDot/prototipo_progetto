import { jest } from '@jest/globals';

// Helper to load the script after setting up DOM
function loadQRScript() {
  return import('../test.js');
}

describe('startQRScanner', () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="qrScannerUI" style="display:none">
        <p></p>
        <video id="qrVideoFeed"></video>
        <canvas id="qrCanvas"></canvas>
      </div>
    `;

    const canvas = document.getElementById('qrCanvas');
    canvas.getContext = jest.fn().mockReturnValue({
      drawImage: jest.fn(),
      getImageData: jest.fn().mockReturnValue({ data: [] })
    });

    // Mock global objects used by startQRScanner
    global.navigator.mediaDevices = {
      getUserMedia: jest.fn(() => Promise.resolve({ getTracks: () => [] }))
    };
    global.requestAnimationFrame = jest.fn();
    global.jsQR = jest.fn();
    global.UIManager = { showARStatusMessage: jest.fn() };

    // Load script and dispatch DOMContentLoaded so startQRScanner is attached to window
    await loadQRScript();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    // Stop automatic scanner started during load
    if (window.stopQRScanner) {
      window.stopQRScanner();
    }
  });

  test('video element receives stream and UI becomes visible', async () => {
    const video = document.getElementById('qrVideoFeed');
    const ui = document.getElementById('qrScannerUI');

    await window.startQRScanner();

    // Resolve getUserMedia promise
    await Promise.resolve();

    // Trigger the metadata loaded callback
    video.videoWidth = 640;
    video.videoHeight = 480;
    video.onloadedmetadata();

    expect(video.srcObject).toBeDefined();
    expect(ui.style.display).toBe('flex');
  });
});
