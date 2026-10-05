const Bill = require('../models/Bill');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { notifyFlat } = require('../utils/notify');

/* ============ FEATURE 4: Society bills & maintenance payment ============ */

const nextInvoiceNo = async () => {
  const count = await Bill.countDocuments();
  return `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
};

// POST /api/bills  (admin)  { flatNo | 'ALL', type, description, amount, period, dueDate }
exports.create = asyncHandler(async (req, res) => {
  const { flatNo, type, description, amount, period, dueDate } = req.body;
  let flats = [flatNo];
  if (flatNo === 'ALL') {
    flats = await User.distinct('flatNo', { society: req.user.society, role: 'resident' });
  }

  const bills = [];
  for (const f of flats) {
    const bill = await Bill.create({
      society: req.user.society,
      flatNo: f,
      invoiceNo: await nextInvoiceNo(),
      type,
      description,
      amount,
      period,
      dueDate,
      createdBy: req.user._id,
    });
    bills.push(bill);
    await notifyFlat(User, req.user.society, f, {
      title: `New ${type} bill`,
      message: `Rs ${amount} due on ${new Date(dueDate).toLocaleDateString()} (${period || ''}).`,
      type: 'bill',
      data: { billId: bill._id },
    });
  }
  res.status(201).json({ bills, count: bills.length });
});

// GET /api/bills?status=   resident -> own flat; admin -> all
exports.list = asyncHandler(async (req, res) => {
  const filter = { society: req.user.society };
  if (req.user.role === 'resident') filter.flatNo = req.user.flatNo;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.flatNo && req.user.role === 'admin') filter.flatNo = req.query.flatNo;

  // auto-flag overdue
  await Bill.updateMany(
    { ...filter, status: 'unpaid', dueDate: { $lt: new Date() } },
    { status: 'overdue' }
  );

  const bills = await Bill.find(filter).sort({ status: 1, dueDate: -1 });
  const dues = bills.filter((b) => b.status !== 'paid').reduce((s, b) => s + b.amount, 0);
  res.json({ bills, totalDue: dues });
});

// GET /api/bills/:id
exports.getOne = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, society: req.user.society };
  if (req.user.role === 'resident') filter.flatNo = req.user.flatNo;
  const bill = await Bill.findOne(filter);
  if (!bill) return res.status(404).json({ message: 'Bill not found' });
  res.json({ bill });
});

// POST /api/bills/:id/pay  (resident)  { method }  -> simulated payment gateway
exports.pay = asyncHandler(async (req, res) => {
  const bill = await Bill.findOne({ _id: req.params.id, society: req.user.society, flatNo: req.user.flatNo });
  if (!bill) return res.status(404).json({ message: 'Bill not found' });
  if (bill.status === 'paid') return res.status(400).json({ message: 'Already paid' });

  const method = ['upi', 'card', 'netbanking'].includes(req.body.method) ? req.body.method : 'upi';
  bill.status = 'paid';
  bill.paidAt = new Date();
  bill.paymentMethod = method;
  bill.paymentRef = `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`;
  await bill.save();

  res.json({ bill, receipt: { invoiceNo: bill.invoiceNo, amount: bill.amount, ref: bill.paymentRef, paidAt: bill.paidAt, method } });
});

// POST /api/bills/:id/mark-paid  (admin, offline cash/cheque)
exports.markPaid = asyncHandler(async (req, res) => {
  const bill = await Bill.findOne({ _id: req.params.id, society: req.user.society });
  if (!bill) return res.status(404).json({ message: 'Bill not found' });
  bill.status = 'paid';
  bill.paidAt = new Date();
  bill.paymentMethod = req.body.method === 'cheque' ? 'cheque' : 'cash';
  bill.paymentRef = req.body.ref || `OFFLINE${Date.now()}`;
  await bill.save();
  res.json({ bill });
});

// GET /api/bills/summary  (admin)  collection stats
exports.summary = asyncHandler(async (req, res) => {
  const rows = await Bill.aggregate([
    { $match: { society: req.user.society } },
    { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const summary = { paid: { total: 0, count: 0 }, unpaid: { total: 0, count: 0 }, overdue: { total: 0, count: 0 } };
  rows.forEach((r) => (summary[r._id] = { total: r.total, count: r.count }));
  res.json({ summary });
});
