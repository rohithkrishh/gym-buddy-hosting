const getCart = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.redirect("/login");
        }

        const cartData = await Cart.findOne({ user: userId })
            .populate("items.product")
            .lean();

        if (!cartData || cartData.items.length === 0) {
            return res.render("cart", { cart: { items: [], totalPrice: 0 } });
        }

        let hasInsufficientStock = false;
        let errorMessage = null;

        cartData.items = cartData.items.map((item) => {
            const variant = item.product.variants.find((variant) => variant.size === item.size);
            const stockQuantity = variant ? variant.quantity : 0;

            if (item.quantity > stockQuantity || stockQuantity === 0) {
                hasInsufficientStock = true;
            }

            return {
                ...item,
                stockQuantity,
            };
        });

        if (hasInsufficientStock) {
            errorMessage = "One or more products in your cart have insufficient stock. Please remove or reduce the quantity.";
        }

        console.log("Cart Data:", cartData);
        res.render("cart", {
            cart: cartData,
            user: userId,
            errorMessage,
        });
    } catch (error) {
        console.error("Error at getCart:", error);
        res.redirect("/pageNotFound");
    }
};