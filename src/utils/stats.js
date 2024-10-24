import { tryCatchWrapper } from "./Functions.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import VisitorCount from "../models/Visitors.js";

const calculatePercentage = (thisMonth, lastMonth) => {
  if (lastMonth === 0) return thisMonth * 100;
 
  const percentage = ((thisMonth - lastMonth) / lastMonth) * 100;
  return Number( percentage.toFixed(0));
};

const sixMonthsago = new Date();
sixMonthsago.setMonth(sixMonthsago.getMonth() - 6);
export const getDashboardStats = async (req, res) => {

  const VisitCount = await VisitorCount.findOne({});
  const today = new Date();

  const startOfThisMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  const endOfThisMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    0
  );

  const startOfLastMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth() - 1,
    1
  );

  const endOfLastMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    0
  );
  // for products
  const thisMonthproductsPromise = Product.find({
    created_at: { $gte: startOfThisMonth, $lte: endOfThisMonth },
  });
  const lastMonthproductsPromise = Product.find({
    created_at: { $gte: startOfLastMonth, $lte: endOfLastMonth },
  });
  // for users
  const thisMonthUsersPromise = User.find({
    created_at: { $gte: startOfThisMonth, $lte: endOfThisMonth },
  });
  const lastMonthUsersPromise = User.find({
    created_at: { $gte: startOfLastMonth, $lte: endOfLastMonth },
  });
  // for orders
  const thisMonthOrdersPromise = Order.find({
    order_date: { $gte: startOfThisMonth, $lte: endOfThisMonth },
    payment_status: { $ne: "Pending" },
  });

 const thisMonthExpensesPromise = await Product.aggregate([
    { $unwind: "$stockHistory" },
    { 
      $match: {
        "stockHistory.date": { $gte: startOfThisMonth, $lte: endOfThisMonth },
        "stockHistory.reason": { $in: ["new", "restock"] }
      }
    },
    { 
      $project: {
        _id: 0,
        expense: {
          $cond: {
            if: { $eq: ["$stockHistory.reason", "new"] },
            then: { $multiply: [{ $subtract: ["$stockHistory.newStock", 0] }, "$stockHistory.purchase_price"] },
            else: { $multiply: [{ $subtract: ["$stockHistory.newStock", "$stockHistory.previousStock"] }, "$stockHistory.purchase_price"] }
          }
        }
      }
    },
    { 
      $group: {
        _id: null,
        totalExpense: { $sum: "$expense" }
      }
    }
  ]);

  // Query for previous month expenses
  const lastMonthExpensesPromise = await Product.aggregate([
    { $unwind: "$stockHistory" },
    { 
      $match: {
        "stockHistory.date": { $gte: startOfLastMonth, $lte: endOfLastMonth },
        "stockHistory.reason": { $in: ["new", "restock"] }
      }
    },
    { 
      $project: {
        _id: 0,
        expense: {
          $cond: {
            if: { $eq: ["$stockHistory.reason", "new"] },
            then: { $multiply: [{ $subtract: ["$stockHistory.newStock", 0] }, "$stockHistory.purchase_price"] },
            else: { $multiply: [{ $subtract: ["$stockHistory.newStock", "$stockHistory.previousStock"] }, "$stockHistory.purchase_price"] }
          }
        }
      }
    },
    { 
      $group: {
        _id: null,
        totalExpense: { $sum: "$expense" }
      }
    }
  ]);
  
  const lastMonthOrdersPromise = Order.find({
    order_date: { $gte: startOfLastMonth, $lte: endOfLastMonth },
    payment_status: { $ne: "Pending" },
  });
  
  const lastSixMonthOrdersPromise = Order.find({
    order_date: { $gte: sixMonthsago, $lte: today },
    payment_status: { $ne: "Pending" },
  });


  const [
    thisMonthproducts,
    lastMonthproducts,
    thisMonthUsers,
    lastMonthUsers,
    thisMonthOrders,
    lastMonthOrders,
    // thisMonthExpense,
    // lastMonthExpense,
    productCount,
    userCount,
    allOrders,
    lastSixMonthOrders
  ] = await Promise.all([
    thisMonthproductsPromise,
    lastMonthproductsPromise,
    thisMonthUsersPromise,
    lastMonthUsersPromise,
    thisMonthOrdersPromise,
    lastMonthOrdersPromise,
    // thisMonthExpensesPromise,
    // lastMonthExpensesPromise,
    Product.countDocuments(),
    User.countDocuments(),
    Order.countDocuments({ payment_status: { $ne: "Pending" } }),
    lastSixMonthOrdersPromise
  ]);


  // const thisMonthRevenue = thisMonthOrders.reduce(
  //   (total, order) => total + (order.total_amount || 0),
  //   0
  // );
  // const lastMonthRevenue = lastMonthOrders.reduce(
  //   (total, order) => total + (order.total_amount || 0),
  //   0
  // );



  
  const changePercentage = {
    // revenue : calculatePercentage(thisMonthRevenue, lastMonthRevenue),
    product : calculatePercentage(
        thisMonthproducts.length,
        lastMonthproducts.length
      ),
      user :calculatePercentage(
        thisMonthUsers.length,
        lastMonthUsers.length
      ),
      order :calculatePercentage(
        thisMonthOrders.length,
        lastMonthOrders.length
      )
  };

  
  const date = new Date();
const year = date.getFullYear();

const months = [
  { startOfMonth: new Date(year, 0, 1), endOfMonth: new Date(year, 0, 31) },  // January
  { startOfMonth: new Date(year, 1, 1), endOfMonth: new Date(year, 1, 29) },  // February
  { startOfMonth: new Date(year, 2, 1), endOfMonth: new Date(year, 2, 31) },  // March
  { startOfMonth: new Date(year, 3, 1), endOfMonth: new Date(year, 3, 30) },  // April
  { startOfMonth: new Date(year, 4, 1), endOfMonth: new Date(year, 4, 31) },  // May
  { startOfMonth: new Date(year, 5, 1), endOfMonth: new Date(year, 5, 30) },  // June
  { startOfMonth: new Date(year, 6, 1), endOfMonth: new Date(year, 6, 31) },  // July
  { startOfMonth: new Date(year, 7, 1), endOfMonth: new Date(year, 7, 31) },  // August
  { startOfMonth: new Date(year, 8, 1), endOfMonth: new Date(year, 8, 30) },  // September
  { startOfMonth: new Date(year, 9, 1), endOfMonth: new Date(year, 9, 31) },  // October
  { startOfMonth: new Date(year, 10, 1), endOfMonth: new Date(year, 10, 30) }, // November
  { startOfMonth: new Date(year, 11, 1), endOfMonth: new Date(year, 11, 31) }  // December
];
           

  const expensesPromises = months.map(({ startOfMonth, endOfMonth }) => {
    return Product.aggregate([
      { $unwind: "$stockHistory" },
      { 
        $match: {
          "stockHistory.date": { $gte: startOfMonth, $lte: endOfMonth },
          "stockHistory.reason": { $in: ["new", "restock"] }
        }
      },
      { 
        $project: {
          _id: 0,
          expense: {
            $cond: {
              if: { $eq: ["$stockHistory.reason", "new"] },
              then: { $multiply: [{ $subtract: ["$stockHistory.newStock", 0] }, "$stockHistory.purchase_price"] },
              else: { $multiply: [{ $subtract: ["$stockHistory.newStock", "$stockHistory.previousStock"] }, "$stockHistory.purchase_price"] }
            }
          }
        }
      },
      { 
        $group: {
          _id: null,
          totalExpense: { $sum: "$expense" }
        }
      }
    ]).then(result => {
      return {
        month: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
        expense: (result.length > 0) ? result[0].totalExpense : 0
      };
    });
    
  });

  const revenuePromises = months.map(({ startOfMonth, endOfMonth }) => {
    return Order.find({
      order_date: { $gte: startOfMonth, $lte: endOfMonth },
      payment_status: { $ne: "Pending" }
    }).then(orders => ({
      month: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
      revenue: orders.reduce((total, order) => total + (order.total_amount || 0), 0)
    }));
  });

  const [expensesResults, revenueResults] = await Promise.all([
    Promise.all(expensesPromises),
    Promise.all(revenuePromises),
  ]);


const count ={
  product : productCount,
  user : userCount,
  order : allOrders,
  // revenue : thisMonthRevenue,
}


  const stats = {
    changePercentage,
    count,
    expenses: expensesResults,
    revenue: revenueResults,
    VisitCount : VisitCount.count,
  };

  res.status(200).json({
    success: true,
    stats,
  });
};

export const getPieCharts = async (req, res) => {
    try {
      const recentStatusCounts = await Order.aggregate([
        { $unwind: "$status" },
        { $sort: { "status.date": -1 } },
        {
          $group: {
            _id: "$order_number",
            latestStatus: { $first: "$status.status" }
          }
        },
        {
          $group: {
            _id: "$latestStatus",
            count: { $sum: 1 }
          }
        }
      ]);
  
      const orderFullFillment = recentStatusCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {});
      const expectedStatuses = [ "Ordered", "Shipped", "Delivered", "Cancelled"];
      expectedStatuses.forEach(status => {
        if (!orderFullFillment.hasOwnProperty(status)) {
          orderFullFillment[status] = 0;
        }
      });

      const [outOfStock, inStock] = await Promise.all([
        Product.countDocuments({ stock: 0 }),
        Product.countDocuments({ stock: { $gt: 0 } }),
      ]);

      const productStock = {
        outOfStock,
        inStock
      };
  
      const charts = {
        orderFullFillment,
        productStock
      };
  
  
      res.status(200).json({
        success: true,
        charts,
      });
    } catch (error) {
      console.error('Error fetching pie chart data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pie chart data',
      });
    }
  };
  

  const getStartAndEndOfMonth = (date) => {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
    return { startOfMonth, endOfMonth };
  };
  
  const getStartAndEndOfYear = (date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const endOfYear = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  
    return { startOfYear, endOfYear };
  };
  
  const getMonthsForYear = () => {
    const months = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59);
      months.push({
        startOfMonth,
        endOfMonth,
        month: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`
      });
    }
  
    return months;
  };
  
  export const getBarCharts = async (req, res) => {

      const months = getMonthsForYear();
           


      const salesData = await Order.aggregate([
        // Match only orders that have a "Delivered" status
        {
          $match: { "status.status": "Delivered" } // Match only delivered orders
        },
        {
          $addFields: {
            // Calculate the total price of all items in the order
            totalItemsPrice: {
              $sum: {
                $map: {
                  input: "$items",
                  as: "item",
                  in: { $multiply: ["$$item.quantity", "$$item.price"] }
                }
              }
            }
          }
        },
        {
          $unwind: "$items" // Unwind the items array to work with individual products
        },
        {
          $lookup: {
            from: 'products', // The products collection
            localField: "items.product",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        {
          $unwind: "$productDetails" // Unwind the product details
        },
        {
          $addFields: {
            // Proportion of the discount that applies to this item based on its price
            proportionalDiscount: {
              $multiply: [
                { $divide: [{ $multiply: ["$items.quantity", "$items.price"] }, "$totalItemsPrice"] },
                { $ifNull: ["$discount", 0] } // Apply the order-level discount proportionally
              ]
            }
          }
        },
        {
          $group: {
            _id: "$productDetails.category", // Group by the category name directly
            totalSold: { $sum: "$items.quantity" }, // Sum the quantity sold for each category
            totalRevenue: {
              $sum: {
                $subtract: [
                  { $multiply: ["$items.quantity", "$items.price"] }, // Original revenue
                  "$proportionalDiscount" // Subtract the proportional discount for each item
                ]
              }
            }
          }
        }
      ]);
  
      // Fetch expenses, revenues, delivered orders, and canceled orders for each month
      const expensesPromises = months.map(({ startOfMonth, endOfMonth }) => {
        return Product.aggregate([
          { $unwind: "$stockHistory" },
          { 
            $match: {
              "stockHistory.date": { $gte: startOfMonth, $lte: endOfMonth },
              "stockHistory.reason": { $in: ["new", "restock"] }
            }
          },
          { 
            $project: {
              _id: 0,
              expense: {
                $cond: {
                  if: { $eq: ["$stockHistory.reason", "new"] },
                  then: { $multiply: [{ $subtract: ["$stockHistory.newStock", 0] }, "$stockHistory.purchase_price"] },
                  else: { $multiply: [{ $subtract: ["$stockHistory.newStock", "$stockHistory.previousStock"] }, "$stockHistory.purchase_price"] }
                }
              }
            }
          },
          { 
            $group: {
              _id: null,
              totalExpense: { $sum: "$expense" }
            }
          }
        ]).then(result => ({
          month: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
          expense: (result.length > 0) ? result[0].totalExpense : 0
        }));
      });
  
      const revenuePromises = months.map(({ startOfMonth, endOfMonth }) => {
        return Order.find({
          order_date: { $gte: startOfMonth, $lte: endOfMonth },
          payment_status: { $ne: "Pending" }
        }).then(orders => ({
          month: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
          revenue: orders.reduce((total, order) => total + (order.total_amount || 0), 0)
        }));
      });
  
      const deliveredAndCancelledOrdersPromises = months.map(({ startOfMonth, endOfMonth }) => {
        return Promise.all([
          Order.countDocuments({
            order_date: { $gte: startOfMonth, $lte: endOfMonth },
            'status.status': 'Delivered'
          }),
          Order.countDocuments({
            order_date: { $gte: startOfMonth, $lte: endOfMonth },
            'status.status': 'Cancelled'
          })
        ]).then(([deliveredCount, cancelledCount]) => ({
          month: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
          deliveredCount,
          cancelledCount
        }));
      });
  
      // Resolve all promises
      const [expensesResults, revenueResults, deliveredAndCancelledResults] = await Promise.all([
        Promise.all(expensesPromises),
        Promise.all(revenuePromises),
        Promise.all(deliveredAndCancelledOrdersPromises)
      ]);
  
      // Combine results
      const barChartData = months.map(({ month }) => ({
        month,
        expense: (expensesResults.find(e => e.month === month) || {}).expense || 0,
        revenue: (revenueResults.find(r => r.month === month) || {}).revenue || 0,
        deliveredCount: (deliveredAndCancelledResults.find(d => d.month === month) || {}).deliveredCount || 0,
        cancelledCount: (deliveredAndCancelledResults.find(d => d.month === month) || {}).cancelledCount || 0,
        
      }),
    );


  
      res.status(200).json({
        success: true,
        barChartData,
        salesData
      });
  };
  
  
  
export const getLineCharts =async (req, res) => {
    const months = getMonthsForYear();
    const expensesPromises = months.map(({ startOfMonth, endOfMonth }) => {
        return Product.aggregate([
          { $unwind: "$stockHistory" },
          { 
            $match: {
              "stockHistory.date": { $gte: startOfMonth, $lte: endOfMonth },
              "stockHistory.reason": { $in: ["new", "restock"] }
            }
          },
          { 
            $project: {
              _id: 0,
              expense: {
                $cond: {
                  if: { $eq: ["$stockHistory.reason", "new"] },
                  then: { $multiply: [{ $subtract: ["$stockHistory.newStock", 0] }, "$stockHistory.purchase_price"] },
                  else: { $multiply: [{ $subtract: ["$stockHistory.newStock", "$stockHistory.previousStock"] }, "$stockHistory.purchase_price"] }
                }
              }
            }
          },
          { 
            $group: {
              _id: null,
              totalExpense: { $sum: "$expense" }
            }
          }
        ]).then(result => ({
          month: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
          expense: (result.length > 0) ? result[0].totalExpense : 0
        }));
      });
  
      const revenuePromises = months.map(({ startOfMonth, endOfMonth }) => {
        return Order.find({
          order_date: { $gte: startOfMonth, $lte: endOfMonth },
          payment_status: { $ne: "Pending" }
        }).then(orders => ({
          month: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
          revenue: orders.reduce((total, order) => total + (order.total_amount || 0), 0)
        }));
      });

      const newUserPromises = months.map(({ startOfMonth, endOfMonth }) => {
        return User.countDocuments({
          created_at: { $gte: startOfMonth, $lte: endOfMonth }
        }).then(count => ({
          month: `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`,
          newUser: count
        }));
      });

      // Resolve all promises
      const [expensesResults, revenueResults ,newUserResults] = await Promise.all([
        Promise.all(expensesPromises),
        Promise.all(revenuePromises),
        Promise.all(newUserPromises)
      ]);
  
      // Combine results
      const lineChartData = months.map(({ month }) => ({
        month,
        expense: (expensesResults.find(e => e.month === month) || {}).expense || 0,
        revenue: (revenueResults.find(r => r.month === month) || {}).revenue || 0,
        newUser: (newUserResults.find(r => r.month === month) || {}).newUser || 0
      }));
  
      res.status(200).json({
        success: true,
        lineChartData
      });
};