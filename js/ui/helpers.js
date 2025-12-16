// CSS classes for styling different states
export const UI_CLASSES = {
    authenticated: 'authenticated',
    unauthenticated: 'unauthenticated',
    loading: 'loading',
    error: 'error',
    success: 'success'
};

// Helper to produce an SVG path for domain symbol shapes matching radar's DOMAIN_SYMBOLS
export function getSymbolPathForDomain(name) {
    const MAP = {
        'Cloud & Mission Critical': d3.symbolSquare,
        'Business Consultancy': d3.symbolTriangle,
        'Enterprise Applications': d3.symbolDiamond,
        'Data & AI': d3.symbolStar,
        'Experience, Development & Software': d3.symbolCircle
    };
    const sym = MAP[name] || d3.symbolCircle;
    return d3.symbol().type(sym).size(80)();
}
