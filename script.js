// --- Configuration ---
const GENERIC_BARCODE_LENGTH = 10;
const QR_DATA_LENGTH = 16;
const GRID_UPDATE_INTERVAL = 500;
const FOCUSED_UPDATE_INTERVAL = 500;

let focusedIntervalId = null;

// --- String Generation Functions ---
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

// --- Rendering Functions ---
function renderBarcode(elementId, value, type, options = {}) {
  const canvas = document.getElementById(elementId);
  if (!canvas) return;

  const defaultOptions = {
    bcid: type,           // The barcode type (e.g., 'code128', 'qrcode')
    text: value,          // The data to encode
    scale: 3,             // Overall scaling factor
    height: 5,            // Bar height (mostly affects 1D barcodes)
    width: 10,
    includetext: false    // Hide human-readable text by default
  };

  try {
    bwipjs.toCanvas(canvas, { ...defaultOptions, ...options });
  } catch (err) {
    console.error(`Error rendering barcode ${type}:`, err);
  }
}

const barcodeConfigs = {
  'code39': { 
    title: 'Code39', type: 'code39', 
    valueId: 'code39Value', canvasId: 'code39Barcode',
    generatorFn: () => generateRandomAlphanumeric(GENERIC_BARCODE_LENGTH, true)
  },
  'code39check': { 
    title: 'Code39 (Check Digit)', type: 'code39', 
    valueId: 'code39CheckDigitValue', canvasId: 'code39CheckDigitBarcode',
    generatorFn: () => generateRandomAlphanumeric(GENERIC_BARCODE_LENGTH, true), 
    options: { includecheck: true } 
  },
  'code128': { 
    title: 'Code128', type: 'code128', 
    valueId: 'code128Value', canvasId: 'code128Barcode',
    generatorFn: () => generateRandomAlphanumeric(GENERIC_BARCODE_LENGTH) 
  },
  'qr': { 
    title: 'QR Code', type: 'qrcode', is2D: true, 
    valueId: 'qrCodeValue', canvasId: 'qrCode',
    generatorFn: () => generateRandomAlphanumeric(QR_DATA_LENGTH),
    options: { height: 10 } 
  },
  'datamatrix': { 
    title: 'Data Matrix', type: 'datamatrix', is2D: true, 
    valueId: 'dataMatrixValue', canvasId: 'dataMatrixCode',
    generatorFn: () => generateRandomAlphanumeric(QR_DATA_LENGTH),
    options: { height: 10 } 
  },
  'ups': { 
    title: 'UPS Tracking', type: 'code128', 
    valueId: 'upsValue', canvasId: 'upsBarcode',
    generatorFn: () => '1Z' + generateRandomAlphanumeric(16, true) 
  },
  'fedex': { 
    title: 'FedEx Tracking', type: 'code128', 
    valueId: 'fedexValue', canvasId: 'fedexBarcode',
    generatorFn: () => generateRandomNumeric(14) 
  },
  'dhl': { 
    title: 'DHL Tracking', type: 'code128', 
    valueId: 'dhlValue', canvasId: 'dhlBarcode',
    generatorFn: () => generateStringFromEngine('DHL') 
  },
  'marken': { 
    title: 'Marken Tracking', type: 'code128', 
    valueId: 'markenValue', canvasId: 'markenBarcode',
    generatorFn: () => generateStringFromEngine('Marken') 
  },
  'worldcourier': { 
    title: 'World Courier', type: 'code128', 
    valueId: 'worldCourierValue', canvasId: 'worldCourierBarcode',
    generatorFn: () => generateRandomNumeric(9) 
  },
  'quickstat': { 
    title: 'Quickstat', type: 'code128', 
    valueId: 'quickstatValue', canvasId: 'quickstatBarcode',
    generatorFn: () => generateRandomNumeric(9) + 'W' 
  },
  'mlm': { 
    title: '^\\d{12}$', type: 'code128', 
    valueId: 'mlmValue', canvasId: 'mlmBarcode',
    generatorFn: () => generateRandomNumeric(12) 
  },
  'pScanned': { 
    title: '^[0-9A-HJ-NPR-TV-Z]+$', type: 'code39', 
    valueId: 'pScannedValue', canvasId: 'pScannedBarcode',
    generatorFn: () => generateStringFromEngine('pScanned'), 
    options: { includecheck: true } 
  },
  'pSiteSwab': { 
    title: '^[0-9A-HJ-NPR-TV-Z]{6}$', type: 'code39', 
    valueId: 'pSiteSwabValue', canvasId: 'pSiteSwabBarcode',
    generatorFn: () => generateStringFromEngine('pSiteSwab'), 
    options: { includecheck: true } 
  },
  'pSelfSwab': { 
    title: '^[0-9A-HJ-NPR-TV-Z]{7}$', type: 'code39', 
    valueId: 'pSelfSwabValue', canvasId: 'pSelfSwabBarcode',
    generatorFn: () => generateStringFromEngine('pSelfSwab'), 
    options: { includecheck: true } 
  }
};


// --- Main Grid Update ---
function updateAllBarcodes() {
  Object.values(barcodeConfigs).forEach(config => {
    // Generate the value
    const value = config.generatorFn();
    
    // Update the DOM text
    const textElement = document.getElementById(config.valueId);
    if (textElement) textElement.textContent = value;
    
    // Render the barcode
    renderBarcode(config.canvasId, value, config.type, config.options);
  });
}

// --- Focused View Logic ---
function showFocusedView(input) {
  // Input can either be a config (from custom view) or just a string
  const config = typeof input === 'string' ? barcodeConfigs[input] : input;
  if (!config) return;

  document.getElementById('mainGrid').classList.add('hidden');
  const focusedView = document.getElementById('focusedView');
  focusedView.classList.remove('hidden');
  focusedView.classList.add('flex');
  
  document.getElementById('focusedBarcodeCanvas').classList.remove('hidden');
  document.getElementById('focusedTitle').textContent = config.title;

  // Merge the base sizing with any specific options (like includecheck and 1D vs 2D)
  const baseOptions = config.is2D 
    ? { scale: 8, height: 8, width: 10 }
    : { scale: 4, height: 15, width: 60 };
  const finalOptions = { ...baseOptions, ...(config.options || {}) };

  const updateFocused = () => {
    const newValue = config.generatorFn();
    document.getElementById('focusedValue').textContent = newValue;
    renderBarcode('focusedBarcodeCanvas', newValue, config.type, finalOptions);
  };

  // Run immediately, then start the interval
  updateFocused();

  // Clear the interval if one is already running before starting a new one
  if (focusedIntervalId) {
    clearInterval(focusedIntervalId);
    focusedIntervalId = null;
  }

  // Only start the loop if this config isn't static (is not a string)
  if (!config.static) {
    focusedIntervalId = setInterval(updateFocused, FOCUSED_UPDATE_INTERVAL);
  }
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

// --- Custom Barcode Generator ---
// DOM Elements
const customTypeSelect = document.getElementById('customType');
const btnRegex = document.getElementById('btnRegex');
const btnCustomData = document.getElementById('btnCustomData');
const inputLabel = document.getElementById('inputLabel');
const customDataInput = document.getElementById('customData');
const generateOneBtn = document.getElementById('generateOneBtn');
const generateLotBtn = document.getElementById('generateLotBtn');

const customCanvasEl = document.getElementById('customBarcodeCanvas');
const customValueDisplay = document.getElementById('customValueDisplay');
const customErrorDisplay = document.getElementById('customErrorDisplay');

// State
let currentCustomMode = 'regex'; // 'regex' or 'custom'
let customLoopIntervalId = null;

// Define the active and inactive classes
const activeBtnClasses = ['bg-indigo-600', 'text-white', 'shadow-inner'];
const inactiveBtnClasses = ['bg-gray-100', 'text-gray-600', 'hover:bg-gray-200', 'dark:bg-gray-700', 'dark:text-gray-300', 'dark:hover:bg-gray-600'];

function setMode(mode) {
  currentCustomMode = mode;

  stopLoopGeneration();
  
  if (mode === 'regex') {
    // Style Regex button as active
    btnRegex.classList.remove(...inactiveBtnClasses);
    btnRegex.classList.add(...activeBtnClasses);
    
    // Style Custom Data button as inactive
    btnCustomData.classList.remove(...activeBtnClasses);
    btnCustomData.classList.add(...inactiveBtnClasses);
    
    // Update input UI
    inputLabel.textContent = "Regex Pattern";
    customDataInput.placeholder = "e.g., ^[A-Z]{3}\\d{4}$";
    customDataInput.value = ""; 
    
    generateLotBtn.disabled = false;
  } else {
    // Style Custom Data button as active
    btnCustomData.classList.remove(...inactiveBtnClasses);
    btnCustomData.classList.add(...activeBtnClasses);
    
    // Style Regex button as inactive
    btnRegex.classList.remove(...activeBtnClasses);
    btnRegex.classList.add(...inactiveBtnClasses);
    
    // Update input UI
    inputLabel.textContent = "Data";
    customDataInput.placeholder = "Enter exact barcode data here";
    customDataInput.value = ""; 
    
    generateLotBtn.disabled = true;
  }
}

btnRegex.addEventListener('click', () => setMode('regex'));
btnCustomData.addEventListener('click', () => setMode('data'));

function generateCustomBarcode() {
  console.log('called generate custom barcode');
  const inputValue = customDataInput.value.trim();

  console.log(inputValue);
  const selectedType = customTypeSelect.value;

  // Reset displays
  customErrorDisplay.textContent = '';
  customCanvasEl.classList.add('hidden');
  customValueDisplay.textContent = '';

  if (!inputValue) {
    customErrorDisplay.textContent = 'Please enter a value.';
    stopLoopGeneration();
    return false;
  }

  let barcodeData = '';

  // Determine the string to turn into a barcode
  if (currentCustomMode === 'data') {
    barcodeData = inputValue;
  } else if (currentCustomMode === 'regex') {
    try {
      new RegExp(inputValue);
      barcodeData = new RandExp(inputValue).gen();
    } catch (e) {
      customErrorDisplay.textContent = 'Invalid regex.';
      stopLoopGeneration();
      return false;
    }
  }

  // Render the actual barcode
  const config = barcodeConfigs[selectedType];
  const baseOptions = config.is2D 
    ? { scale: 8, height: 8, width: 10 }
    : { scale: 4, height: 15, width: 60 };
  const finalOptions = { ...baseOptions, ...(config.options || {}) };

  try {
    customValueDisplay.textContent = barcodeData;
    customCanvasEl.classList.remove('hidden');

    renderBarcode('customBarcodeCanvas', barcodeData, config.type, finalOptions);
    return true;
  } catch (e) {
    console.error("Barcode Generation Error:", e);
    customCanvasEl.classList.add('hidden');
    customValueDisplay.textContent = '';
    customErrorDisplay.textContent = e.message.includes('Invalid') 
      ? `Invalid characters for ${config.title}.`
      : 'Could not generate barcode.';
    stopLotGeneration();
    return false;
  }
}

function showFocusedCustom() {
  const inputValue = customDataInput.value.trim();
  const selectedType = customTypeSelect.value;
  const baseConfig = barcodeConfigs[selectedType];

  // If no barcode generated yet, do nothing when clicked
  if (!customValueDisplay.textContent) return;

  const isLooping = (customLoopIntervalId !== null);

  const currentDisplayedValue = customValueDisplay.textContent;

  // Create temporary config object that look like barcodeConfigs
  const customConfig = {
    title: `Custom (${baseConfig.title})`,
    type: baseConfig.type,
    is2D: baseConfig.is2D,
    options: baseConfig.options,
    generatorFn: () => {
      if (currentCustomMode === 'regex' && isLooping) {
        return new RandExp(inputValue).gen();
      }
      return currentDisplayedValue;
    },
    static: !isLooping
  };
  showFocusedView(customConfig);
}

function stopLoopGeneration() {
  if (customLoopIntervalId) {
    clearInterval(customLoopIntervalId);
    customLoopIntervalId = null;
  }
}

generateOneBtn.addEventListener('click', () => {
  stopLoopGeneration();
  generateCustomBarcode();
});

generateLotBtn.addEventListener('click', () => {
  stopLoopGeneration(); // Prevent starting multiple intervals

  const success = generateCustomBarcode(); // Start one

  if (success) {
    customLoopIntervalId = setInterval(generateCustomBarcode, GRID_UPDATE_INTERVAL);
  }
})

// --- Initial Load and Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  updateAllBarcodes();
  setInterval(updateAllBarcodes, GRID_UPDATE_INTERVAL);
  setMode('regex');
});
