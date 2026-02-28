const chroma = require('chroma-js');

const colors = {
    theme1: '#172625',
    theme2: '#59544A',
    theme3: '#BF9B7A',
    theme4: '#D9C2AD'
};

for (const [name, hex] of Object.entries(colors)) {
    const oklch = chroma(hex).oklch();
    // Format: L C h
    const formatted = `${oklch[0].toFixed(3)} ${oklch[1].toFixed(3)} ${(oklch[2] || 0).toFixed(3)}`;
    console.log(`${name} (${hex}): ${formatted}`);

    const hsl = chroma(hex).hsl();
    const hslFormatted = `${(hsl[0] || 0).toFixed(1)} ${(hsl[1] * 100).toFixed(1)}% ${(hsl[2] * 100).toFixed(1)}%`;
    console.log(`${name} border/ring hsl: ${hslFormatted}`);
}
