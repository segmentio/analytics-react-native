package com.segment.analytics

import com.segment.analytics.ValueMap
import com.segment.analytics.internal.Utils
import java.util.*
import java.util.Collections.addAll

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Segment.io, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */


/**
 * Properties are a dictionary of free-form information to attach to specific events.
 *
 *
 * Just like traits, we also accept some properties with semantic meaning, and you should only
 * ever use these property names for that purpose.
 */
internal class Properties : ValueMap {
    constructor() {}
    constructor(initialCapacity: Int) : super(initialCapacity) {}
    // For deserialization
    internal constructor(delegate: Map<String, Any>) : super(delegate) {}

    override fun putValue(key: String?, value: Any?): Properties {
        super.putValue(key, value)
        return this
    }

    /**
     * Set the amount of revenue an event resulted in. This should be a decimal value in dollars, so a
     * shirt worth $19.99 would result in a revenue of 19.99.
     */
    fun putRevenue(revenue: Double): Properties {
        return putValue(REVENUE_KEY, revenue)
    }

    fun revenue(): Double {
        return getDouble(REVENUE_KEY, 0.toDouble())
    }

    /**
     * Set an abstract value to associate with an event. This is typically used in situations where
     * the event doesn't generate real-dollar revenue, but has an intrinsic value to a marketing team,
     * like newsletter signups.
     */
    fun putValue(value: Double): Properties {
        return putValue(VALUE_KEY, value)
    }

    fun value(): Double {
        val value: Double = getDouble(VALUE_KEY, 0.toDouble())
        return if (value != 0.0) {
            value
        } else revenue()
    }

    /** The currency for the value set in [.putRevenue].  */
    fun putCurrency(currency: String?): Properties {
        return putValue(CURRENCY_KEY, currency)
    }

    fun currency(): String {
        return getString(CURRENCY_KEY)
    }

    /**
     * Set a path (usually the path of the URL) for the screen.
     *
     * @see [Page Properties](https://segment.com/docs/api/tracking/page/.properties)
     */
    fun putPath(path: String?): Properties {
        return putValue(PATH_KEY, path)
    }

    fun path(): String {
        return getString(PATH_KEY)
    }

    /**
     * Set the referrer that led the user to the screen. In the browser it is the document.referrer
     * property.
     *
     * @see [Page Properties](https://segment.com/docs/api/tracking/page/.properties)
     */
    fun putReferrer(referrer: String?): Properties {
        return putValue(REFERRER_KEY, referrer)
    }

    fun referrer(): String {
        return getString(REFERRER_KEY)
    }

    /**
     * Set the title of the screen.
     *
     * @see [Page Properties](https://segment.com/docs/api/tracking/page/.properties)
     */
    fun putTitle(title: String?): Properties {
        return putValue(TITLE_KEY, title)
    }

    fun title(): String {
        return getString(TITLE_KEY)
    }

    /**
     * Set a url for the screen.
     *
     * @see [Page Properties](https://segment.com/docs/api/tracking/page/.properties)
     */
    fun putUrl(url: String?): Properties {
        return putValue(URL_KEY, url)
    }

    fun url(): String {
        return getString(URL_KEY)
    }

    /**
     * Set the name of the product associated with an event.
     *
     * @see [Ecommerce API](https://segment.com/docs/api/tracking/ecommerce/)
     */
    fun putName(name: String?): Properties {
        return putValue(NAME_KEY, name)
    }

    fun name(): String {
        return getString(NAME_KEY)
    }

    /**
     * Set a category for this action. You'll want to track all of your product category pages so you
     * can quickly see which categories are most popular.
     *
     * @see [Ecommerce API](https://segment.com/docs/api/tracking/ecommerce/)
     */
    fun putCategory(category: String?): Properties {
        return putValue(CATEGORY_KEY, category)
    }

    fun category(): String {
        return getString(CATEGORY_KEY)
    }

    /**
     * Set a sku for the product associated with an event.
     *
     * @see [Ecommerce API](https://segment.com/docs/api/tracking/ecommerce/)
     */
    fun putSku(sku: String?): Properties {
        return putValue(SKU_KEY, sku)
    }

    fun sku(): String {
        return getString(SKU_KEY)
    }

    /**
     * Set a price (in dollars) for the product associated with an event.
     *
     * @see [Ecommerce API](https://segment.com/docs/api/tracking/ecommerce/)
     */
    fun putPrice(price: Double): Properties {
        return putValue(PRICE_KEY, price)
    }

    fun price(): Double {
        return getDouble(PRICE_KEY, 0.toDouble())
    }

    /**
     * Set an ID for the product associated with an event.
     *
     * @see [Ecommerce API](https://segment.com/docs/api/tracking/ecommerce/)
     */
    fun putProductId(id: String?): Properties {
        return putValue(ID_KEY, id)
    }

    fun productId(): String {
        return getString(ID_KEY)
    }

    /**
     * Set the order ID associated with an event.
     *
     * @see [Ecommerce API](https://segment.com/docs/api/tracking/ecommerce/)
     */
    fun putOrderId(orderId: String?): Properties {
        return putValue(ORDER_ID_KEY, orderId)
    }

    fun orderId(): String {
        return getString(ORDER_ID_KEY)
    }

    /**
     * Set the total amount (in dollars) for an order associated with an event.
     *
     * @see [Ecommerce API](https://segment.com/docs/api/tracking/ecommerce/)
     */
    fun putTotal(total: Double): Properties {
        return putValue(TOTAL_KEY, total)
    }

    fun total(): Double {
        val total: Double = getDouble(TOTAL_KEY, 0.toDouble())
        if (total != 0.0) {
            return total
        }
        val revenue = revenue()
        return if (revenue != 0.0) {
            revenue
        } else value()
    }

    /**
     * Set the subtotal (in dollars) for an order associated with an event (excluding tax and
     * shipping).
     *
     * @see [Ecommerce API](https://segment.com/docs/api/tracking/ecommerce/)
     */
    fun putSubtotal(subtotal: Double): Properties {
        return putValue(SUBTOTAL_KEY, subtotal)
    }

    @Deprecated("use {@link #subtotal()} ")
    fun putSubtotal(): Double {
        return subtotal()
    }

    fun subtotal(): Double {
        return getDouble(SUBTOTAL_KEY, 0.toDouble())
    }

    /**
     * Set the shipping amount (in dollars) for an order associated with an event.
     *
     * @see [Ecommerce API](https://segment.com/docs/api/tracking/ecommerce/)
     */
    fun putShipping(shipping: Double): Properties {
        return putValue(SHIPPING_KEY, shipping)
    }

    fun shipping(): Double {
        return getDouble(SHIPPING_KEY, 0.toDouble())
    }

    /**
     * Set the tax amount (in dollars) for an order associated with an event.
     *
     * @see [Ecommerce API](https://segment.com/docs/api/tracking/ecommerce/)
     */
    fun putTax(tax: Double): Properties {
        return putValue(TAX_KEY, tax)
    }

    fun tax(): Double {
        return getDouble(TAX_KEY, 0.toDouble())
    }

    /**
     * Set the discount amount (in dollars) for an order associated with an event.
     *
     * @see [Ecommerce API](https://segment.com/docs/api/tracking/ecommerce/)
     */
    fun putDiscount(discount: Double): Properties {
        return putValue(DISCOUNT_KEY, discount)
    }

    fun discount(): Double {
        return getDouble(DISCOUNT_KEY, 0.toDouble())
    }

    /**
     * Set a coupon name for an order associated with an event.
     *
     * @see [Ecommerce API](https://segment.com/docs/api/tracking/ecommerce/)
     */
    fun putCoupon(coupon: String?): Properties {
        return putValue(COUPON_KEY, coupon)
    }

    fun coupon(): String {
        return getString(COUPON_KEY)
    }

    /**
     * Set the individual products for an order associated with an event.
     *
     * @see [Ecommerce API](https://segment.com/docs/api/tracking/ecommerce/)
     */
    fun putProducts(vararg products: Product?): Properties {
        require(!Utils.isNullOrEmpty(products)) { "products cannot be null or empty." }
        val productList: MutableCollection<Product?> = ArrayList(products.size)
        addAll(productList, *products)
        return putValue(PRODUCTS_KEY, productList)
    }

    @Deprecated("Use {@link #products()} instead. ")
    fun products(vararg products: Product?): List<Product> {
        return products()
    }

    fun products(): List<Product> {
        return getList(PRODUCTS_KEY, Product::class.java)
    }

    /**
     * Set whether an order associated with an event is from a repeating customer.
     *
     * @see [Ecommerce API](https://segment.com/docs/api/tracking/ecommerce/)
     */
    fun putRepeatCustomer(repeat: Boolean): Properties {
        return putValue(REPEAT_KEY, repeat)
    }

    val isRepeatCustomer: Boolean
        get() = getBoolean(REPEAT_KEY, false)

    /**
     * A representation of an e-commerce product.
     *
     *
     * Use this only when you have multiple products, usually for the "Completed Order" event. If
     * you have only one product, [Properties] has methods on it directly to attach this
     * information.
     */
    class Product : ValueMap {
        /**
         * Create an e-commerce product with the given id, sku and price (in dollars). All parameters
         * are required for our ecommerce API.
         *
         * @param id The product ID in your database
         * @param sku The product SKU
         * @param price The price of the product (in dollars)
         */
        constructor(id: String?, sku: String?, price: Double) {
            put(ID_KEY, id)
            put(SKU_KEY, sku)
            put(PRICE_KEY, price)
        }

        // For deserialization
        private constructor(map: Map<String, Any>) : super(map) {}

        /** Set an optional name for this product.  */
        fun putName(name: String?): Product {
            return putValue(NAME_KEY, name)
        }

        fun name(): String {
            return getString(NAME_KEY)
        }

        fun id(): String {
            return getString(ID_KEY)
        }

        fun sku(): String {
            return getString(SKU_KEY)
        }

        fun price(): Double {
            return getDouble(PRICE_KEY, 0.toDouble())
        }

        override fun putValue(key: String?, value: Any?): Product {
            super.putValue(key, value)
            return this
        }

        companion object {
            private const val ID_KEY = "id"
            private const val SKU_KEY = "sku"
            private const val NAME_KEY = "name"
            private const val PRICE_KEY = "price"
        }
    }

    companion object {
        // Common Properties
        private const val REVENUE_KEY = "revenue"
        private const val CURRENCY_KEY = "currency"
        private const val VALUE_KEY = "value"
        // Screen Properties
        private const val PATH_KEY = "path"
        private const val REFERRER_KEY = "referrer"
        private const val TITLE_KEY = "title"
        private const val URL_KEY = "url"
        // Ecommerce API
        private const val NAME_KEY = "name" // used by product too
        private const val CATEGORY_KEY = "category"
        private const val SKU_KEY = "sku"
        private const val PRICE_KEY = "price"
        private const val ID_KEY = "id"
        private const val ORDER_ID_KEY = "orderId"
        private const val TOTAL_KEY = "total"
        private const val SUBTOTAL_KEY = "subtotal"
        private const val SHIPPING_KEY = "shipping"
        private const val TAX_KEY = "tax"
        private const val DISCOUNT_KEY = "discount"
        private const val COUPON_KEY = "coupon"
        private const val PRODUCTS_KEY = "products"
        private const val REPEAT_KEY = "repeat"
    }
}