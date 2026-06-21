// utils.js

/**
 * Creates an HTML element with given attributes and children.
 * @param {string} tag 
 * @param {object} attributes 
 * @param {string|Node[]} children 
 * @returns {HTMLElement}
 */
export function createElement(tag, attributes = {}, children = []) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attributes)) {
        el.setAttribute(key, value);
    }
    
    if (typeof children === 'string') {
        el.textContent = children;
    } else if (Array.isArray(children)) {
        children.forEach(child => el.appendChild(child));
    }
    return el;
}

/**
 * Clears all child nodes from an element.
 * @param {HTMLElement} element 
 */
export function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}
