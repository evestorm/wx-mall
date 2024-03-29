// pages/cart/cart.js
const util = require('../../utils/util')
const db = require('../../utils/db')

Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    cartList: [],
    isSelectAllChecked: false,
    isCartEdit: false,
    cartCheckMap: {}, // 所有选中商品集合
    cartTotal: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },

  getCart() {
    wx.showLoading({
      title: 'Loading...',
    })

    const cartCheckMap = this.data.cartCheckMap
    db.getCart().then(result => {
      wx.hideLoading()

      const data = result.result

      if (data.length) {
        // update the total price for cart
        this.setData({
          cartTotal: util.priceFormat(0),
          cartList: data
        })
        console.log(this.data.cartList)
      }
    }).catch(err => {
      console.error(err)
      wx.hideLoading()

      wx.showToast({
        icon: 'none',
        title: 'Failed'
      })
    })
  },

  onTapCheck(event) {
    // 获取当前商品唯一id
    const checkId = event.currentTarget.dataset.id
    const cartCheckMap = this.data.cartCheckMap
    let isSelectAllChecked = this.data.isSelectAllChecked
    const cartList = this.data.cartList
    let cartTotal = 0

    if (checkId === 'selectAll') {
      // 设置全选按钮自身状态
      isSelectAllChecked = !isSelectAllChecked
      cartList.forEach(product => {
        cartCheckMap[product.productId] = isSelectAllChecked
      })
    } else {
      cartCheckMap[checkId] = !cartCheckMap[checkId]
      // 首先假设目前是全选中
      isSelectAllChecked = true
      // 然后遍历所有商品，只要有一个状态不是选中，则设置全选自身状态为false
      cartList.forEach(product => {
        if (!cartCheckMap[product.productId]) {
          // not all product selected
          isSelectAllChecked = false
        }
      })
    }

    cartTotal = this.updateTotalPrice(cartList, cartCheckMap)

    this.setData({
      cartTotal,
      isSelectAllChecked,
      cartCheckMap
    })
  },

  updateTotalPrice(cartList, cartCheckMap) {
    let checkout = 0
    cartList.forEach(product => {
      if (cartCheckMap[product.productId]) checkout += product.price * product.count
    })

    return util.priceFormat(checkout)
  },

  onTapEditCart() {
    if (!this.data.isCartEdit) {
      this.setData({
        isCartEdit: true
      })
    // 编辑结束后更新云端购物车数据
    } else {
      this.updateCart()
    }
  },

  adjustCartProductCount(event) {
    const dataset = event.currentTarget.dataset
    const adjustType = dataset.type
    const productId = dataset.id
    const cartCheckMap = this.data.cartCheckMap
    let cartList = this.data.cartList
    const productToAdjust = cartList.find(product => product.productId === productId) || {}

    if (adjustType === 'add') {
      productToAdjust.count++
    } else {
      if (productToAdjust.count >= 2) {
        productToAdjust.count--
      } else {
        delete cartCheckMap[productId]
        cartList = cartList.filter(product => product.productId !== productId)
      }
    }

    const cartTotal = this.updateTotalPrice(cartList, cartCheckMap)

    this.setData({
      cartTotal,
      cartList,
    })

    // 购物车数量为0时会立即跳转到无商品时所展示的页面，
    // 所以在上述情况发生之前，就同步云端数据
    if (!cartList.length) {
      this.updateCart()
    }

  },

  updateCart() {
    wx.showLoading({
      title: 'Loading...',
    })

    const cartList = this.data.cartList

    db.updateCart(cartList).then(result => {
      wx.hideLoading()

      const data = result.result

      if (data) {
        this.setData({
          isCartEdit: false
        })
      }
    }).catch(err => {
      console.error(err)
      wx.hideLoading()

      wx.showToast({
        icon: 'none',
        title: 'Failed'
      })
    })
  },

  onTapCheckout() {
    if (this.data.cartTotal == 0) {
      wx.showToast({
        icon: 'none',
        title: 'Please Select Items',
      })
      return
    }

    wx.showLoading({
      title: 'Loading...',
    })

    const cartCheckMap = this.data.cartCheckMap
    const cartList = this.data.cartList
    const productsToCheckout = cartList.filter(product => cartCheckMap[product.productId])
    const cartToUpdate = cartList.filter(product => !cartCheckMap[product.productId])

    db.addToOrder({
      list: productsToCheckout,
      isCheckout: true
    }).then(result => {
      wx.hideLoading()

      const data = result.result

      if (data) {
        wx.showToast({
          title: 'Succeed',
        })

        this.setData({
          cartList: cartToUpdate
        })

        this.getCart()
      }
    }).catch(err => {
      console.error(err)
      wx.hideLoading()

      wx.showToast({
        icon: 'none',
        title: 'Failed',
      })
    })
  },

  onTapLogin(event) {
    this.setData({
      userInfo: event.detail.userInfo
    })

    this.getCart()
  },
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    util.getUserInfo().then(userInfo => {
      this.setData({
        userInfo
      })

      this.getCart()
    }).catch(err => console.log('Not Authenticated yet'))
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})