import { default as Web3 } from 'web3';
import { default as contract } from 'truffle-contract';
import ecommerce_store_artifacts from '../../build/contracts/EcommerceStore.json';

var EcommerceStore = contract(ecommerce_store_artifacts);

var ipfsAPI = require('ipfs-api');

var ipfs = ipfsAPI({ host: 'localhost', port: '5001', protocol: 'http' });

Date.prototype.format = function(fmt) { //author: meizz   
    var o = {
        "M+": this.getMonth() + 1, //月份   
        "d+": this.getDate(), //日   
        "h+": this.getHours(), //小时   
        "m+": this.getMinutes(), //分   
        "s+": this.getSeconds(), //秒   
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度   
        "S": this.getMilliseconds() //毫秒   
    };
    if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt))
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

window.App = {
    start: function() {
        var sellLayer;
        var self = this;
        EcommerceStore.setProvider(web3.currentProvider || "ws://localhost:8545");
        renderStore();
        showCategories();
        showProduceCount();

        // 添加弹出表单
        $("#to-sell").click((event) => {
            layui.use('layer', function() {
                var layer = layui.layer;

                sellLayer = layer.open({
                    area: ['50%', '85vh'],
                    type: 1,
                    title: 'Input Produce Info',
                    closeBtn: 0,
                    shadeClose: true,
                    content: $('#form-div')
                });
            });
        });

        var reader;
        $("#product-image").change(event => {
            const file = event.target.files[0];
            reader = new window.FileReader();
            reader.readAsArrayBuffer(file);
        });

        $("#add-item-to-store").submit(function(event) {
            const req = $("#add-item-to-store").serialize();
            console.log("req:", req);
            let params = JSON.parse('{"' + req.replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
            console.log("params: ", params);
            let decodedParams = {};
            Object.keys(params).forEach(key => {
                decodedParams[key] = decodeURIComponent(decodeURI(params[key]));
            });
            saveProduct(reader, decodedParams);
            event.preventDefault();
        });

        if ($("#product-details").length > 0) {
            let productId = new URLSearchParams(window.location.search).get('id');
            renderProductDetails(productId);
        }

        $("#bidding").submit(event => {
            let amount = $("#bid-amount").val();
            let sendAmount = $("#bid-send-amount").val();
            let secretText = $("#secret-text").val();
            let productId = $("#product-id").val();
            let sealedBid = web3.sha3(web3.toWei(amount, 'ether').toString() + secretText);
            EcommerceStore.deployed().then(i => {
                i.bid(parseInt(productId), sealedBid, { from: web3.eth.accounts[0], value: web3.toWei(sendAmount, 'ether') }).then(res => {
                    showSuccessMessage("our bid has been successfully submitted!");
                    location.reload();
                }).catch(err => {
                    console.log(err);
                    showErrorInfo(err);
                });
            });
            event.preventDefault();
        });

        $("#revealing").submit(event => {
            let amount = $("#actual-amount").val();
            let secretText = $("#reveal-secret-text").val();
            let productId = $("#product-id").val();
            EcommerceStore.deployed().then(i => {
                i.revealBid(parseInt(productId), web3.toWei(amount, 'ether').toString(), secretText, { from: web3.eth.accounts[0] }).then(res => {
                    showSuccessMessage("Your bid has been successfully revealed!");
                    location.reload();
                }).catch(err => {
                    showErrorInfo(err);
                });
            });
            event.preventDefault();
        });

        $("#finalize-auction").submit(event => {
            let productId = $("#product-id").val();
            EcommerceStore.deployed().then(i => {
                i.finalizeAuction(parseInt(productId), { from: web3.eth.accounts[0] }).then(res => {
                    showSuccessMessage("The auction has been finalized and winner declared.");
                    location.reload();
                }).catch(err => {
                    showErrorInfo(err);
                });
            })
            event.preventDefault();
        });

        $("#release-funds").click(() => {
            let productId = new URLSearchParams(window.location.search).get("id");
            EcommerceStore.deployed().then(i => {
                showSuccessMessage("Your transaction has been submitted. Please wait for few seconds for the confirmation");
                i.releaseAmountToSeller(productId, { from: web3.eth.accounts[0] }).then(res => {
                    location.reload();
                }).catch(err => {
                    showErrorInfo();
                    console.log(err);
                });
            })
        });

        $("#refund-funds").click(() => {
            let productId = new URLSearchParams(window.location.search).get("id");
            EcommerceStore.deployed().then(i => {
                showSuccessMessage("Your transaction has been submitted. Please wait for few seconds for the confirmation");
                i.refundAmountToBuyer(productId, { from: web3.eth.accounts[0] }).then(res => {
                    location.reload();
                }).catch(err => {
                    showErrorInfo(err);
                    console.log();
                });
            });
            alert("refund funds!");
        });
    },
};

const offchainServer = "http://localhost:3000";
const categories = ["Art", "Books", "Cameras", "Cell Phones & Accessories", "Clothing", "Computers & Tablets", "Gift Cards & Coupons", "Musical Instruments & Gear", "Pet Supplies", "Pottery & Glass", "Sporting Goods", "Tickets", "Toys & Hobbies", "Video Games"];

function renderProducts(div, filters) {
    $.ajax({
        url: offchainServer + "/products",
        type: 'get',
        contentType: "application/json; charset=utf-8",
        data: filters
    }).done(function(data) {
        if (data.length == 0) {
            $("#" + div).html('No products found');
        } else {
            $("#" + div).html('');
        }
        while (data.length > 0) {
            let chunks = data.splice(0, 3);
            // 记录层
            let row = $("<div/>");
            row.addClass("layui-row").addClass("layui-col-space30");
            $("#" + div).append(row);

            // 添加节点
            chunks.forEach(function(value) {
                let node = buildProduct(value);
                row.append(node);
            })

        }
    })
}

function renderStore(filter = {}) {
    renderProducts("product-list", {...filter });
    renderProducts("product-reveal-list", { productStatus: "reveal", ...filter });
    renderProducts("product-finalize-list", { productStatus: "finalize", ...filter });
}

function showProduceCount() {
    EcommerceStore.deployed().then(i => {
        i.getProductCount().then(res => {
            $("#total-products").text(res);
        }).catch(err => {
            showErrorInfo(err);
        });
    });
}

function showCategories() {
    categories.forEach(function(value) {
        let filter = { category: value };
        let element = document.createElement("li");
        element.className = "layui-nav-item";
        element.onclick = () => {
            renderStore(filter);
        };
        element.innerHTML = `<a  href="javascript:;">${value}</a>`;

        $("#categories").append(element);
    })
}

function buildProduct(product) {
    console.log(product);
    let node = $("<div />");
    node.addClass("layui-col-sm4");

    let a = $("<a />");
    a.prop("href", `product.html?id=${product.blockchainId}`);
    console.log("a", a);
    node.append(a);

    let produceCode = $(`<div />`);
    produceCode.addClass("layui-panel").addClass("produce-card");
    a.append(produceCode);

    let beginTime = new Date(product.auctionStartTime * 1000).format("yyyy-MM-dd hh:mm:ss");
    let endTime = new Date(product.auctionEndTime * 1000).format("yyyy-MM-dd hh:mm:ss");

    produceCode.append(`<p><img style="width: 150px;height:200px;" src="http://localhost:8080/ipfs/${product.ipfsImageHash}" /></p>`);

    produceCode.append("<p class='produce-name'> " + product.name + " </p>");
    produceCode.append("<p>" + product.category + "</p>");
    produceCode.append("<p>" + product.productStatus == 0 ? "Used" : "New" + "</p>");
    produceCode.append("<p> Begin Time:" + beginTime + "</p>");
    produceCode.append("<p> End Time:" + endTime + "</p>");
    produceCode.append("<p class='produce-price'>" + web3.fromWei(product.price, "ether") + " Ether</p>");
    return node;
}

function saveProduct(reader, decodedParams) {
    let imageId, descId;
    saveImageOnIpfs(reader).then(id => {
        imageId = id;
        saveTextBlobOnIpfs(decodedParams["product-description"]).then(id => {
            descId = id;
            saveProductToBlockchain(decodedParams, imageId, descId);
        });
    });
}

function saveImageOnIpfs(reader) {
    return new Promise((resolve, reject) => {
        console.log(reader);
        let buffer = Buffer.from(reader.result);
        ipfs.add(buffer).then(res => {
            console.log("res: ", res);
            resolve(res[0].hash);
        }).catch(err => {
            console.error(err);
            reject(err);
        });
    });
}

function saveTextBlobOnIpfs(blob) {
    return new Promise((resolve, reject) => {
        let buffer = Buffer.from(blob, 'utf-8');
        ipfs.add(buffer).then(res => {
            console.log("res: ", res);
            resolve(res[0].hash);
        }).catch(err => {
            console.error(err);
            reject(err);
        });
    });
}

function saveProductToBlockchain(params, imageId, descId) {
    console.log("params in save product: ", params);
    let auctionStartTime = Date.parse(params["product-auction-start"]) / 1000;
    let auctionEndTime = auctionStartTime + parseInt(params["product-auction-end"]) * 60;

    console.log("auctionStartTime", auctionStartTime);
    console.log("auctionEndTime", auctionEndTime);
    EcommerceStore.deployed().then(i => {
        i.addProductToStore(params["product-name"], params["product-category"], imageId, descId, auctionStartTime, auctionEndTime, web3.toWei(params["product-price"], 'ether'), parseInt(params["product-condition"]), { from: web3.eth.accounts[0] }).then(res => {
            showSuccessMessage("success start selling you produce");
            location.reload();
        }).catch(err => {
            showErrorInfo(err);
        });
    });
}

function renderProductDetails(productId) {
    EcommerceStore.deployed().then(i => {
        i.getProduct(productId).then(p => {
            console.log("detail p ", p);
            let desc = '';
            ipfs.cat(p[4]).then(file => {
                desc = file.toString();
                $("#product-desc").append("<div>" + desc + "</div>");
            });
            $("#product-image").append("<img src='http://localhost:8080/ipfs/" + p[3] + "' width='100%' />");
            $("#product-name").html(p[1]);
            $("#product-price").html(displayPrice(p[7]));
            $("#product-id").val(p[0]);
            $("#product-auction-end").html(displayEndTime(p[6]));
            $(".product-plane").hide();
            $("#prduct-info-plane").show();
            let currentTime = getCurrentTime();
            if (parseInt(p[8]) == 1)
                EcommerceStore.deployed().then(i => {
                    $("#escrow-info-plane,#escrow-operter-plane").show();
                    i.highestBidderInfo(productId).then(info => {
                        $("#product-status").html("Auction has ended. Product sold to " + info[0] + " for " + displayPrice(info[2]) +
                            "The money is in the escrow. Two of the three participants (Buyer, Seller and Arbiter) have to " +
                            "either release the funds to seller or refund the money to the buyer");
                    }).catch(err => {
                        showErrorInfo(err);
                    });
                    i.escrowInfo(productId).then(info => {
                        $("#seller").html('Seller: ' + info[0]);
                        $("#buyer").html('Buyer: ' + info[1]);
                        $("#arbiter").html('Arbiter: ' + info[2]);
                        if (info[3] == true) {
                            $("#escrow-operter-plane").hide();
                            $("#release-count").html("Amount from the escrow has been released");
                        } else {
                            $("#release-count").html(info[4] + " of 3 participants have agreed to release funds to seller");
                            $("#refund-count").html(info[5] + " of 3 participants have agreed to refund the buyer");
                        }
                    }).catch(err => {
                        showErrorInfo(err);
                    });
                }).catch(err => {
                    showErrorInfo(err);
                });

            else if (parseInt(p[8]) == 2)
                $("#product-status").html("Product not sold");
            else if (currentTime < p[6])
                $("#bidding-plane").show();
            else if (currentTime - (200) < p[6])
                $("#revealing-plane").show();
            else
                $("#finalize-auction-plane").show();
        }).catch(err => {
            showErrorInfo(err);
        });
    });
}

function showSuccessMessage(value) {
    showMessage(value, "success-msg", "layui-icon-ok");
}

function showErrorInfo(err) {
    layui.define(function() {
        let RexRes = err.message.match(/\{.+\}/i);
        if (RexRes != null && RexRes.length != 0) {
            var messageObjectStr = RexRes[0];
            var messageObject = JSON.parse(messageObjectStr);
            var layer = layui.layer;
            showErrorMessage(messageObject.value.data.message);
        } else {
            showErrorMessage(err);
        }
    });
}

function showErrorMessage(value) {
    showMessage(value, "err-msg", "layui-icon-close");
}

function showMessage(value, className, icon) {
    layer.msg(`<i class='layui-icon ${icon}'> </i>${value}`, {
        skin: className,
        offset: ["1px"],
        time: 6000
    });
}

function displayPrice(amount) {
    return web3.fromWei(amount, 'ether') + 'ETH';
}

function getCurrentTime() {
    return Math.round(new Date() / 1000);
}

function displayEndTime(timestamp) {
    let current_time = getCurrentTime();
    let remaining_time = timestamp - current_time;

    if (remaining_time <= 0) {
        return "Auction has ended";
    }
    let days = Math.trunc(remaining_time / (60 * 60 * 24));
    remaining_time -= days * 60 * 60 * 24;

    let hours = Math.trunc(remaining_time / (60 * 60));
    remaining_time -= hours * 60 * 60;

    let minutes = Math.trunc(remaining_time / 60);
    remaining_time -= minutes * 60;

    if (days > 0) {
        return "Auction ends in " + days + " days" + hours + " hours" + minutes + " minutes" + remaining_time + " seconds";
    } else if (hours > 0) {
        return "Auction ends in " + hours + " hours" + minutes + " minutes" + remaining_time + " seconds";
    } else if (minutes > 0) {
        return "Auction ends in " + minutes + " minutes" + remaining_time + " seconds";
    } else {
        return "Auction ends in " + remaining_time + " seconds";
    }
}

window.addEventListener('load', function() {
    if (typeof web3 !== undefined) {
        window.web3 = new Web3(web3.currentProvider);
    } else {
        window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    }
    App.start();
});