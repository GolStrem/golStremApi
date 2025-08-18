function isSubset(A, B) {
    return A.every(elem => B.includes(elem));
}

function capitalize(str) {
    return str[0].toUpperCase() + str.slice(1);
}


function check(str, regex) {
    const match = str.match(regex);
    return match ? match[1] : false;
}


module.exports = { isSubset, capitalize , check};
