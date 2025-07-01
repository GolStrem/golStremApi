function isSubset(A, B) {
    return A.every(elem => B.includes(elem));
}

function capitalize(str) {
    return str[0].toUpperCase() + str.slice(1);
}


module.exports = { isSubset, capitalize };
