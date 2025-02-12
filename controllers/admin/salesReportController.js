const Order = require("../../models/orderSchema");
const Poduct = require("../../models/productSchema");
const moment = require('moment');
const ExcelJS = require('exceljs');
const PdfPrinter = require('pdfmake');


const loadSalesReport = async (req,res) => {

  try {

    const ITEMS_PER_PAGE = 15;
    const page = parseInt(req.query.page) || 1;
    const totalOrders = await Order.countDocuments(); 
    const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);

    const orders = await Order.find().populate('user')
    .populate({path:'cartItems.product',
        select:'productName'
  }) 
  .skip((page - 1) * ITEMS_PER_PAGE)
  .limit(ITEMS_PER_PAGE)
  .sort({ createdAt: -1 });


  const totalSales = orders.reduce((sum, order) => sum + (order.finalPrice || 0), 0).toFixed();
  const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0).toFixed();
  const orderCount = orders.length;
 
  const avgOrderValue = orderCount ? (totalSales / orderCount).toFixed() : 0;


    res.render("salesReport",{
      orders,
      totalSales:totalSales,
      orderCount:totalOrders,
      discount:totalDiscount,
      avgOrderValue,
      totalPages,
      currentPage:page,
      itemsPerPage:ITEMS_PER_PAGE,
     
    
    })
    
  } catch (error) {
    console.log("Error creating sales report");

    res.status(500).send("Internal server error");

  }

}



const getFilteredOrders = async (range, startDate, endDate) => {
  let filter = {};
  const today = moment().startOf('day');

  if (range === 'daily') {
      filter = { createdAt: { $gte: today.toDate(), $lte: moment(today).endOf('day').toDate() } };
  } else if (range === 'weekly') {
      filter = { createdAt: { $gte: moment(today).subtract(7, 'days').toDate(), $lte: today.toDate() } };
  } else if (range === 'monthly') {
      filter = { createdAt: { $gte: moment(today).subtract(1, 'month').toDate(), $lte: today.toDate() } };
  } else if (range === 'yearly') {
      filter = { createdAt: { $gte: moment(today).subtract(1, 'year').toDate(), $lte: today.toDate() } };
  } else if (range === 'custom' && startDate && endDate) {
      filter = {
          createdAt: { $gte: moment(startDate).toDate(), $lte: moment(endDate).endOf('day').toDate() },
      };
  }

  return await Order.find(filter).populate('user').populate('cartItems.product');
};


const filteredData = async (req, res) => {
  try {
      const { range, startDate, endDate } = req.body;

      console.log('Range:', range, 'StartDate:', startDate, 'EndDate:', endDate);

      // Fetch filtered orders
      const orders = await getFilteredOrders(range, startDate, endDate);
     console.log("object",orders);
      // Calculate stats
      const totalSales = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0).toFixed();
      const totalDiscount = orders.reduce((sum, order) => sum + (order.discount || 0), 0).toFixed();
      const orderCount = orders.length;
      const avgOrderValue = orderCount ? (totalSales / orderCount).toFixed() : 0;

      // Respond with data
      res.json({
          orders,
          summary: { totalSales, totalDiscount, orderCount, avgOrderValue },
      });
  } catch (err) {
      console.error('Error fetching orders:', err.message);
      res.status(500).send('Error fetching orders');
  }
};



const fonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};

const printer = new PdfPrinter(fonts);


const pdfDownload = async (req, res) => {
    const { range, startDate, endDate } = req.query;

    try {
        const orders = await getFilteredOrders(range, startDate, endDate);

        // PDF Content
        const docDefinition = {
            content: [
                { text: 'Sales Report', style: 'header', alignment: 'center', margin: [0, 10, 0, 10] },

                {
                    table: {
                        headerRows: 1,
                        widths: ['5%', '10%', '15%', '15%', '10%', '10%', '10%', '10%', '10%', '10%'],
                        body: [
                            // Table Headers (Same as EJS)
                            [
                                { text: 'No.', style: 'tableHeader' }, 
                                { text: 'Date', style: 'tableHeader' }, 
                                { text: 'User', style: 'tableHeader' },
                                { text: 'Product', style: 'tableHeader' },
                                { text: 'Quantity', style: 'tableHeader' },
                                { text: 'Sale Price (₹)', style: 'tableHeader' },
                                { text: 'Total Amount (₹)', style: 'tableHeader' },
                                { text: 'Offer Amount (₹)', style: 'tableHeader' },
                                { text: 'Payment', style: 'tableHeader' },
                                { text: 'Status', style: 'tableHeader' }
                            ],

                            // Table Rows (Loop through orders and their cartItems)
                            ...orders.flatMap((order, index) => 
                                order.cartItems.map((item, itemIndex) => {
                                    return [
                                        itemIndex === 0 ? { text: (index + 1), style: 'tableContent', rowSpan: order.cartItems.length } : {},
                                        itemIndex === 0 ? { text: moment(order.createdAt).format('DD-MM-YYYY'), style: 'tableContent', rowSpan: order.cartItems.length } : {},
                                        itemIndex === 0 ? { text: order.user?.name || 'Unknown User', style: 'tableContent', rowSpan: order.cartItems.length } : {},
                                        { text: item.product?.productName || 'NA', style: 'tableContent' },
                                        { text: item.quantity, style: 'tableContent' },
                                        { text: `₹${item.salePrice.toFixed(2)}`, style: 'tableContent' },
                                        itemIndex === 0 ? { text: `₹${order.totalPrice.toFixed(2)}`, style: 'tableContent', rowSpan: order.cartItems.length } : {},
                                        itemIndex === 0 ? { text: `₹${order.discount.toFixed(2)}`, style: 'tableContent', rowSpan: order.cartItems.length } : {},
                                        itemIndex === 0 ? { text: order.paymentMethod, style: 'tableContent', rowSpan: order.cartItems.length } : {},
                                        itemIndex === 0 ? { text: order.orderStatus, style: 'tableContent', rowSpan: order.cartItems.length } : {}
                                    ];
                                })
                            )
                        ]
                    },
                    margin: [0, 10, 0, 10]
                },

                { text: 'Thank you for your business!', style: 'footer', alignment: 'center', margin: [0, 20, 0, 0] }
            ],

            styles: {
                header: { fontSize: 18, bold: true },
                footer: { fontSize: 12 },
                tableHeader: { fontSize: 14, bold: true, alignment: 'center', margin: [0, 5, 0, 5] },
                tableContent: { fontSize: 12, alignment: 'center', margin: [0, 5, 0, 5] }
            }
        };
        
        // Generate PDF
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks = [];

        pdfDoc.on('data', (chunk) => chunks.push(chunk));
        pdfDoc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks);
            res.setHeader('Content-Disposition', 'attachment; filename=SalesReport.pdf');
            res.setHeader('Content-Type', 'application/pdf');
            res.send(pdfBuffer);
        });

        pdfDoc.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating PDF');
    }
};


 const excelDownload = async (req, res) => {
  const { range, startDate, endDate } = req.query;

  try {
      const orders = await getFilteredOrders(range, startDate, endDate);

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sales Report');

      // Header
      sheet.columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Customer', key: 'customer', width: 20 },
          { header: 'Product', key: 'product', width: 25 },
          { header: 'Quantity', key: 'quantity', width: 10 },
          { header: 'Sale Price', key: 'salePrice', width: 15 },
          { header: 'Total Price', key: 'totalPrice', width: 15 },
          { header: 'Discount', key: 'discount', width: 15 },
          { header: 'Payment Method', key: 'paymentMethod', width: 20 },
          { header: 'Order Status', key: 'orderStatus', width: 15 },
      ];

      // Data
      orders.forEach((order) => {
          order.cartItems.forEach((item) => {
              sheet.addRow({
                  date: moment(order.createdAt).format('DD-MM-YYYY'),
                  customer: order.user?.name || 'Unknown User',
                  product: item.product?.productName || 'N/A',
                  quantity: item.quantity,
                  salePrice: item.salePrice,
                  totalPrice: order.totalPrice,
                  discount: order.discount,
                  paymentMethod: order.paymentMethod,
                  orderStatus: order.orderStatus,
              });
          });
      });

      res.setHeader('Content-Disposition', 'attachment; filename=SalesReport.xlsx');
      res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      await workbook.xlsx.write(res);
      res.end();
  } catch (err) {
      console.error(err);
      res.status(500).send('Error generating Excel');
  }
}


  module.exports = {
    loadSalesReport,
    filteredData,
    pdfDownload,
    excelDownload

  }