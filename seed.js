EcommerceStore = artifacts.require('./EcommerceStore.sol');

module.exports = function() {
    amt_1 = web3.toWei(1, 'ether');
    current_time = Math.round(new Date() / 1000);
    EcommerceStore.deployed().then(i => { i.addProductToStore('iphone 5', 'Cell Phones & Accessories', 'QmaBz9r8xv6vLbNyBemSksuBanznu3KxMKN7LfRSoYTyjr', 'QmTLr5Nw7U9xxqDcrx7bYZa27fhbTfB5FrxoFZVzZvTw6y', current_time, current_time + 300, 2 * amt_1, 0).then(console.log) });
    EcommerceStore.deployed().then(i => { i.addProductToStore('iphone 6s', 'Cell Phones & Accessories', 'QmaBz9r8xv6vLbNyBemSksuBanznu3KxMKN7LfRSoYTyjr', 'QmWeysTWsbGfawRNsprZNmeW3v88Ho2RGh3Smi36BwSLCu', current_time, current_time + 600, 3 * amt_1, 0).then(console.log) });
};