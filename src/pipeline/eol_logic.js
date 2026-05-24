/**
 * @file eol_logic.js
 * @description Centralizes complex date and semantic versioning calculations for EOL statuses.
 */

function determineEolStatus(cycle, today) {
    if (!cycle) return { status: 'unknown', label: 'Unknown' };

    const eol = cycle.eol;

    if (eol === true) {
        return { status: 'eol', label: 'End of Life' };
    }
    if (eol === false) {
        return { status: 'supported', label: 'Supported' };
    }

    if (typeof eol === 'string') {
        const eolDate = new Date(eol);
        if (eolDate <= today) {
            return { status: 'eol', label: 'End of Life' };
        }

        const sixMonths = new Date(today);
        sixMonths.setMonth(sixMonths.getMonth() + 6);
        if (eolDate <= sixMonths) {
            return { status: 'approaching', label: 'Approaching EOL' };
        }

        return { status: 'supported', label: 'Supported' };
    }

    return { status: 'unknown', label: 'Unknown' };
}

function compareVersions(a, b) {
    const partsA = String(a).split(/[.-]/).map(p => parseInt(p, 10) || 0);
    const partsB = String(b).split(/[.-]/).map(p => parseInt(p, 10) || 0);
    const maxLen = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < maxLen; i++) {
        const valA = partsA[i] || 0;
        const valB = partsB[i] || 0;
        if (valA !== valB) return valA - valB;
    }
    return 0;
}

function findMatchingCycle(cycles, version) {
    if (!cycles || !Array.isArray(cycles)) return null;

    const versionMatch = version.match(/^(\d+\.\d+)/);
    let cycleKey = versionMatch ? versionMatch[1] : version;

    let found = cycles.find(c => String(c.cycle) === cycleKey);
    if (found) return found;

    const majorOnly = cycleKey.split('.')[0];
    found = cycles.find(c => String(c.cycle) === majorOnly);
    if (found) return found;

    found = cycles.find(c => cycleKey.startsWith(String(c.cycle)));
    return found || null;
}

function findLatestSupportedCycle(cycles, today) {
    if (!cycles || !Array.isArray(cycles)) return null;

    const supported = cycles.filter(c => {
        const statusInfo = determineEolStatus(c, today);
        return statusInfo.status === 'supported' || statusInfo.status === 'approaching';
    });

    if (supported.length > 0) {
        return supported.sort((a, b) => {
            const verA = String(a.latest || a.cycle || '');
            const verB = String(b.latest || b.cycle || '');
            return compareVersions(verB, verA);
        })[0];
    }

    return cycles[0] || null;
}

module.exports = {
    determineEolStatus,
    compareVersions,
    findMatchingCycle,
    findLatestSupportedCycle
};
