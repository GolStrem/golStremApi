function isSubset(A, B) {
    return A.every(elem => B.includes(elem));
}


module.exports = { isSubset };
