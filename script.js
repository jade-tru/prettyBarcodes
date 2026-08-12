// --- Configuration ---
const GENERIC_BARCODE_LENGTH = 10;
const QR_DATA_LENGTH = 16;
const GRID_UPDATE_INTERVAL = 500;
const FOCUSED_UPDATE_INTERVAL = 500;

let focusedIntervalId = null;

// --- Helper Functions ---
// function generateStringFromRegex(regex) {
//   return new RandExp(regex).gen();
// }

function generateRandomString(length, characters) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function generateRandomAlphanumeric(length, uppercaseOnly = false) {
  const chars = uppercaseOnly 
    ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' 
    : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return generateRandomString(length, chars);
}

function generateRandomNumeric(length) {
  return generateRandomString(length, '0123456789');
}

// --- String Generation ---
const BarcodeEngines = {
  Marken: new RandExp(/^([\d]{3}X[\d]{8})$/), 
  DHL: new RandExp(/^(\d{10}|JJD[A-Za-z0-9]{7})$/), // internal regex has a * instead of {6} but that's too much
  pScanned: new RandExp(/^[0-9A-HJ-NPR-TV-Z]{6}$/), // internal regex has a + instead of {6}
  pSiteSwab: new RandExp(/^[0-9A-HJ-NPR-TV-Z]{6}$/),
  pSelfSwab: new RandExp(/^[0-9A-HJ-NPR-TV-Z]{7}$/)
};

function generateStringFromEngine(symbologyKey) {
  const engine = BarcodeEngines[symbologyKey];
  
  if (!engine) {
    console.error(`No pre-compiled engine found for: ${symbologyKey}`);
    return '';
  }
  
  return engine.gen();
}

// --- Generic Barcode Generation Logic ---
function generateCode39Value() { return generateRandomAlphanumeric(GENERIC_BARCODE_LENGTH, true); }
function generateCode128Value() { return generateRandomAlphanumeric(GENERIC_BARCODE_LENGTH); }
// function generateCode93Value() { return generateRandomAlphanumeric(GENERIC_BARCODE_LENGTH, true); }
function generate2DCodeValue() { return generateRandomAlphanumeric(QR_DATA_LENGTH); }

// --- AWB GENERATORS ---
function generateUPSTracking() { return '1Z' + generateRandomAlphanumeric(16, true); } 
function generateFedExTracking() { return generateRandomNumeric(14); } // technically this should be 12-34 digits but that got too long
function generateDHLTracking() { return generateStringFromEngine('DHL'); }
function generateMarkenTracking() { return generateStringFromEngine('Marken'); }
function generateWorldCourierTracking() { return generateRandomNumeric(9); }
function generateQuickstatTracking() { return generateRandomNumeric(9) + 'W'; }

// --- SPECIFIC GENERATORS ---
function generateMLMBarcode() { return generateRandomNumeric(12); }
function generatepScanned() { return generateStringFromEngine('pScanned'); }
function generatepSiteSwab() { return generateStringFromEngine('pSiteSwab'); }
function generatepSelfSwab() { return generateStringFromEngine('pSelfSwab'); }


// --- Rendering Functions ---
function render1DBarcode(elementId, value, options = {}) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const defaultOptions = {
    lineColor: document.body.classList.contains('dark') ? "#FFFFFF" : "#000000",
    width: 2, height: 80, displayValue: false
  };
  JsBarcode(el, value, { ...defaultOptions, ...options }); // ALSO HERE
}

// function render2DCode(elementId, value, type, options = {}) {
//   const canvas = document.getElementById(elementId);
//   if (!canvas) return;
//   const defaultOptions = {
//     bcid: type,
//     text: value,
//     scale: 3,
//     height: 10,
//     width: 10,
//     includetext: false,
//   };
//   bwipjs.toCanvas(canvas, { ...defaultOptions, ...options });
// }

function renderBarcode(elementId, value, type, options = {}) {
  const canvas = document.getElementById(elementId);
  if (!canvas) return;

  const defaultOptions = {
    bcid: type,           // The barcode type (e.g., 'code128', 'qrcode')
    text: value,          // The data to encode
    scale: 3,             // Overall scaling factor
    height: 5,           // Bar height (mostly affects 1D barcodes)
    width: 10,
    includetext: false    // Hide human-readable text by default
  };

  try {
    bwipjs.toCanvas(canvas, { ...defaultOptions, ...options });
  } catch (err) {
    console.error(`Error rendering barcode ${type}:`, err);
  }
}

// --- Custom Barcode Generator ---
function generateCustomBarcode() {
  const type = document.getElementById('customType').value;
  const data = document.getElementById('customData').value;
  
  const svgEl = document.getElementById('customBarcodeSvg');
  const canvasEl = document.getElementById('customBarcodeCanvas');
  const valueDisplay = document.getElementById('customValueDisplay');
  const errorDisplay = document.getElementById('customErrorDisplay');

  // Reset UI
  svgEl.classList.add('hidden');
  canvasEl.classList.add('hidden');
  valueDisplay.textContent = '';
  errorDisplay.textContent = '';

  if (!data.trim()) {
    errorDisplay.textContent = 'Please enter data for the barcode.';
    return;
  }

  try {
    valueDisplay.textContent = data;
  if (type === 'qrcode' || type === 'datamatrix') {
    canvasEl.classList.remove('hidden');
    renderBarcode('customBarcodeCanvas', data, type, {scale: 5, width: 25, height: 25});
  } else if (type === 'CODE39-MOD43') {
    svgEl.classList.remove('hidden');
    render1DBarcode('customBarcodeSvg', data, { format: 'CODE39', mod43: true, height: 100, width: 3});
  // } else if (type === 'CODE93') {
  //   canvasEl.classList.remove('hidden');
  //   renderBarcode('customBarcodeCanvas', data, 'code93', { scale: 3, height: 15, width: 55 });
  } else {
    svgEl.classList.remove('hidden');
    render1DBarcode('customBarcodeSvg', data, { format: type, height: 100, width: 3 });
  }
  } catch (e) {
    console.error("Barcode Generation Error:", e);
    valueDisplay.textContent = '';
    errorDisplay.textContent = e.message.includes('Invalid') 
      ? `Invalid characters for ${type}.`
      : 'Could not generate barcode.';
  }
}


// --- Main Grid Update ---
function updateAllBarcodes() {
  // Symbologies
  const code39Val = generateCode39Value();
  document.getElementById('code39Value').textContent = code39Val;
  renderBarcode('code39Barcode', code39Val, 'code39');

  const code39CheckDigitVal = generateCode39Value();
  document.getElementById('code39CheckDigitValue').textContent = code39CheckDigitVal;
  renderBarcode('code39CheckDigitBarcode', code39CheckDigitVal, 'code39', { includecheck: true});

  const code128Val = generateCode128Value();
  document.getElementById('code128Value').textContent = code128Val;
  renderBarcode('code128Barcode', code128Val, 'code128');

  // const code93Val = generateCode93Value();
  // document.getElementById('code93Value').textContent = code93Val;
  // renderBarcode('code93Barcode', code93Val, 'code93', { scale: 2, height: 15 });

  const qrVal = generate2DCodeValue();
  document.getElementById('qrCodeValue').textContent = qrVal;
  renderBarcode('qrCode', qrVal, 'qrcode', {height: 10});

  const dmVal = generate2DCodeValue();
  document.getElementById('dataMatrixValue').textContent = dmVal;
  renderBarcode('dataMatrixCode', dmVal, 'datamatrix', {height: 10});

  // Shipment Labels
  const upsVal = generateUPSTracking();
  document.getElementById('upsValue').textContent = upsVal;
  renderBarcode('upsBarcode', upsVal, 'code128');

  const fedexVal = generateFedExTracking();
  document.getElementById('fedexValue').textContent = fedexVal;
  renderBarcode('fedexBarcode', fedexVal, 'code128');

  const dhlVal = generateDHLTracking();
  document.getElementById('dhlValue').textContent = dhlVal;
  renderBarcode('dhlBarcode', dhlVal, 'code128');

  const markenVal = generateMarkenTracking();
  document.getElementById('markenValue').textContent = markenVal;
  renderBarcode('markenBarcode', markenVal, 'code128');
  
  const wcVal = generateWorldCourierTracking();
  document.getElementById('worldCourierValue').textContent = wcVal;
  renderBarcode('worldCourierBarcode', wcVal, 'code128');

  const quickstatVal = generateQuickstatTracking();
  document.getElementById('quickstatValue').textContent = quickstatVal;
  renderBarcode('quickstatBarcode', quickstatVal, 'code128');

  // Specific
  const mlmVal = generateMLMBarcode();
  document.getElementById('mlmValue').textContent = mlmVal;
  renderBarcode('mlmBarcode', mlmVal, 'code128');

  const pScannedVal = generatepScanned();
  document.getElementById('pScannedValue').textContent = pScannedVal; 
  renderBarcode('pScannedBarcode', pScannedVal, 'code39', { includecheck: true});

  const pSiteSwabVal = generatepSiteSwab();
  document.getElementById('pSiteSwabValue').textContent = pSiteSwabVal;
  renderBarcode('pSiteSwabBarcode', pSiteSwabVal, 'code39', { includecheck: true});

  const pSelfSwabVal = generatepSelfSwab();
  document.getElementById('pSelfSwabValue').textContent = pSelfSwabVal;
  renderBarcode('pSelfSwabBarcode', pSelfSwabVal, 'code39', { includecheck: true});

}

// --- Focused View Logic ---
function showFocusedCustom() {
  const data = document.getElementById('customValueDisplay').textContent;
  if (!data) return; // Don't open modal if no barcode is generated

  const type = document.getElementById('customType').value;
  const is2D = type === 'qrcode' || type === 'datamatrix';
  
  document.getElementById('mainGrid').classList.add('hidden');
  const focusedView = document.getElementById('focusedView');
  focusedView.classList.remove('hidden');
  focusedView.classList.add('flex');

  if (focusedIntervalId) {
    clearInterval(focusedIntervalId);
    focusedIntervalId = null;
  }

  const svgEl = document.getElementById('focusedBarcodeSvg');
  const canvasEl = document.getElementById('focusedBarcodeCanvas');
  
  const typeSelect = document.getElementById('customType');
  const selectedOptionText = typeSelect.options[typeSelect.selectedIndex].text;
  document.getElementById('focusedTitle').textContent = selectedOptionText;
  document.getElementById('focusedValue').textContent = data;

  svgEl.classList.add('hidden');
  canvasEl.classList.add('hidden');

  if (is2D) {
    canvasEl.classList.remove('hidden');
    renderBarcode('focusedBarcodeCanvas', data, type, { scale: 5, width: 20, height: 20 });
  } else if (type === 'CODE39-MOD43') {
    svgEl.classList.remove('hidden');
    render1DBarcode('focusedBarcodeSvg', data, { format: 'CODE39', mod43: true, height: 150, width: 4 });
  // } else if (type === 'CODE93') {
  //   canvasEl.classList.remove('hidden');
  //   renderBarcode('focusedBarcodeCanvas', data, 'code93', { scale: 4, height: 15, width: 50 });
  } else {
    svgEl.classList.remove('hidden');
    render1DBarcode('focusedBarcodeSvg', data, { format: type, height: 150, width: 4 });
  }
}

const barcodeConfigs = {
  'code39':       { title: 'Code39', type: 'code39', generatorFn: generateCode39Value },
  'code39check':  { title: 'Code39 (Check Digit)', type: 'code39', generatorFn: generateCode39Value, options: { includecheck: true } },
  'code128':      { title: 'Code128', type: 'code128', generatorFn: generateCode128Value },
  'qr':           { title: 'QR Code', type: 'qrcode', generatorFn: generate2DCodeValue, is2D: true },
  'datamatrix':   { title: 'Data Matrix', type: 'datamatrix', generatorFn: generate2DCodeValue, is2D: true },
  
  'ups':          { title: 'UPS Tracking', type: 'code128', generatorFn: generateUPSTracking },
  'fedex':        { title: 'FedEx Tracking', type: 'code128', generatorFn: generateFedExTracking },
  'dhl':          { title: 'DHL Tracking', type: 'code128', generatorFn: generateDHLTracking },
  'marken':       { title: 'Marken Tracking', type: 'code128', generatorFn: generateMarkenTracking },
  'worldcourier': { title: 'World Courier', type: 'code128', generatorFn: generateWorldCourierTracking },
  'quickstat':    { title: 'Quickstat', type: 'code128', generatorFn: generateQuickstatTracking },
  'mlm':          { title: '^\\d{12}$', type: 'code128', generatorFn: generateMLMBarcode },
  
  'pScanned':     { title: '^[0-9A-HJ-NPR-TV-Z]+$', type: 'code39', generatorFn: generatepScanned, options: { includecheck: true } },
  'pSiteSwab':    { title: '^[0-9A-HJ-NPR-TV-Z]{6}$', type: 'code39', generatorFn: generatepSiteSwab, options: { includecheck: true } },
  'pSelfSwab':    { title: '^[0-9A-HJ-NPR-TV-Z]{7}$', type: 'code39', generatorFn: generatepSelfSwab, options: { includecheck: true } }
};

function showFocusedView(barcodeKey) {
  document.getElementById('mainGrid').classList.add('hidden');
  const focusedView = document.getElementById('focusedView');
  focusedView.classList.remove('hidden');
  focusedView.classList.add('flex');
  
  const canvasEl = document.getElementById('focusedBarcodeCanvas');
  canvasEl.classList.remove('hidden'); // Ensure canvas is visible

  // Look up the configuration based on what the user clicked
  const config = barcodeConfigs[barcodeKey];
  if (!config) return; // Safety check in case of a bad key

  document.getElementById('focusedTitle').textContent = config.title;

  // Set default sizes based on 1D vs 2D
  // bwip-js ignores height for 2D codes, so we only pass scale for 2D
  const baseOptions = config.is2D 
    ? { scale: 8, height: 8, width: 8 } 
    : { scale: 4, height: 15, width: 60 };

  // Merge the base sizing with any specific options (like includecheck)
  const finalOptions = { ...baseOptions, ...(config.options || {}) };

  const updateFocused = () => {
    const newValue = config.generatorFn();
    document.getElementById('focusedValue').textContent = newValue;
    
    // Use the unified function
    renderBarcode('focusedBarcodeCanvas', newValue, config.type, finalOptions);
  };

  // Run immediately, then start the interval
  updateFocused();
  
  // Good practice: clear the interval if one is already running before starting a new one
  if (window.focusedIntervalId) clearInterval(window.focusedIntervalId);
  window.focusedIntervalId = setInterval(updateFocused, FOCUSED_UPDATE_INTERVAL);
}


function hideFocusedView() {
  document.getElementById('focusedView').classList.add('hidden');
  document.getElementById('focusedView').classList.remove('flex');
  document.getElementById('mainGrid').classList.remove('hidden');
  
  // Explicitly hide these for cleanliness
  document.getElementById('focusedBarcodeCanvas').classList.add('hidden');

  if (focusedIntervalId) {
    clearInterval(focusedIntervalId);
    focusedIntervalId = null;
  }
}

// --- Initial Load and Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  updateAllBarcodes();
  setInterval(updateAllBarcodes, GRID_UPDATE_INTERVAL);
  document.getElementById('generateCustomBtn').addEventListener('click', generateCustomBarcode);
});
