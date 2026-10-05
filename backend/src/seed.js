/**
 * Demo data seeder.  Run:  npm run seed
 * Creates 1 society, 1 admin, 2 guards, 4 residents, amenities, bills, notices etc.
 * All demo passwords are:  password123
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const Society = require('./models/Society');
const User = require('./models/User');
const Visitor = require('./models/Visitor');
const DailyHelp = require('./models/DailyHelp');
const HelpAttendance = require('./models/HelpAttendance');
const Bill = require('./models/Bill');
const Complaint = require('./models/Complaint');
const Amenity = require('./models/Amenity');
const AmenityBooking = require('./models/AmenityBooking');
const Notice = require('./models/Notice');
const Poll = require('./models/Poll');
const Discussion = require('./models/Discussion');
const Child = require('./models/Child');
const ChildLog = require('./models/ChildLog');
const Notification = require('./models/Notification');

const PASSWORD = 'password123';

async function run() {
  await connectDB();

  await Promise.all(
    [Society, User, Visitor, DailyHelp, HelpAttendance, Bill, Complaint, Amenity, AmenityBooking, Notice, Poll, Discussion, Child, ChildLog, Notification].map((m) => m.deleteMany({}))
  );
  console.log('Cleared existing data');

  const society = await Society.create({
    name: 'Green Valley Apartments',
    address: 'Sector 62, Noida',
    city: 'Noida',
    code: 'GVA001',
    towers: ['A', 'B'],
  });

  const mk = (data) => User.create({ ...data, password: PASSWORD, society: society._id });
  const admin = await mk({ name: 'Rajesh Sharma (Admin)', email: 'admin@gva.com', phone: '9000000001', role: 'admin' });
  const guard1 = await mk({ name: 'Ram Singh', email: 'guard@gva.com', phone: '9000000002', role: 'guard' });
  await mk({ name: 'Shyam Yadav', email: 'guard2@gva.com', phone: '9000000003', role: 'guard' });
  const res1 = await mk({ name: 'Aman Verma', email: 'aman@gva.com', phone: '9111111111', role: 'resident', flatNo: 'A-101', tower: 'A' });
  const res2 = await mk({ name: 'Priya Gupta', email: 'priya@gva.com', phone: '9222222222', role: 'resident', flatNo: 'A-102', tower: 'A' });
  const res3 = await mk({ name: 'Rohit Mehta', email: 'rohit@gva.com', phone: '9333333333', role: 'resident', flatNo: 'B-201', tower: 'B' });
  await mk({ name: 'Neha Singh', email: 'neha@gva.com', phone: '9444444444', role: 'resident', flatNo: 'B-202', tower: 'B', isOwner: false });

  // Visitors
  await Visitor.create([
    { society: society._id, flatNo: 'A-101', name: 'Swiggy Delivery', type: 'delivery', company: 'Swiggy', status: 'pending', createdBy: guard1._id },
    { society: society._id, flatNo: 'A-101', name: 'Vikas (Friend)', type: 'guest', status: 'approved', preApproved: true, passcode: '123456', validFrom: new Date(), validTo: new Date(Date.now() + 86400000), createdBy: res1._id, actionBy: res1._id },
    { society: society._id, flatNo: 'A-102', name: 'Amazon Courier', type: 'delivery', company: 'Amazon', status: 'exited', createdBy: guard1._id, actionBy: res2._id, entryTime: new Date(Date.now() - 7200000), exitTime: new Date(Date.now() - 6900000) },
  ]);

  // Daily help
  const maid = await DailyHelp.create({ society: society._id, name: 'Sunita Devi', phone: '9555555555', type: 'maid', passcode: '111111', flats: ['A-101', 'A-102'], addedBy: res1._id });
  await DailyHelp.create({ society: society._id, name: 'Ramesh (Driver)', phone: '9666666666', type: 'driver', passcode: '222222', flats: ['B-201'], addedBy: res3._id });
  const d = new Date();
  for (let i = 1; i <= 5; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() - i);
    const inT = new Date(day.setHours(8, 0, 0, 0));
    await HelpAttendance.create({ society: society._id, help: maid._id, date: inT.toISOString().slice(0, 10), inTime: inT, outTime: new Date(inT.getTime() + 2 * 3600000), markedBy: guard1._id });
  }

  // Bills
  let n = 1;
  for (const flat of ['A-101', 'A-102', 'B-201', 'B-202']) {
    await Bill.create({ society: society._id, flatNo: flat, invoiceNo: `INV-2026-${String(n++).padStart(5, '0')}`, type: 'maintenance', description: 'Monthly maintenance', amount: 3500, period: 'Oct 2026', dueDate: new Date('2026-10-15'), createdBy: admin._id });
    await Bill.create({ society: society._id, flatNo: flat, invoiceNo: `INV-2026-${String(n++).padStart(5, '0')}`, type: 'maintenance', description: 'Monthly maintenance', amount: 3500, period: 'Sep 2026', dueDate: new Date('2026-09-15'), status: 'paid', paidAt: new Date('2026-09-10'), paymentMethod: 'upi', paymentRef: 'PAYDEMO001', createdBy: admin._id });
  }
  await Bill.create({ society: society._id, flatNo: 'A-101', invoiceNo: `INV-2026-${String(n++).padStart(5, '0')}`, type: 'parking', description: 'Second car parking', amount: 800, period: 'Oct 2026', dueDate: new Date('2026-10-20'), createdBy: admin._id });

  // Complaints
  await Complaint.create([
    { society: society._id, flatNo: 'A-101', raisedBy: res1._id, category: 'plumbing', title: 'Kitchen tap leaking', description: 'Water leaking continuously from the kitchen tap since morning.', priority: 'high', status: 'in_progress', assignedTo: 'Plumber - Mohan', comments: [{ by: admin._id, text: 'Plumber will visit today 4 PM.' }] },
    { society: society._id, flatNo: 'B-201', raisedBy: res3._id, category: 'lift', title: 'Tower B lift making noise', description: 'Lift makes grinding noise between 3rd and 4th floor.', priority: 'medium', status: 'open' },
  ]);

  // Amenities
  const [club, gym] = await Amenity.create([
    { society: society._id, name: 'Clubhouse', description: 'Party hall, 50 people', openTime: '09:00', closeTime: '22:00', slotMinutes: 180, capacity: 1, chargePerSlot: 1500 },
    { society: society._id, name: 'Gym', description: 'Fully equipped gym', openTime: '05:00', closeTime: '22:00', slotMinutes: 60, capacity: 10, chargePerSlot: 0 },
    { society: society._id, name: 'Swimming Pool', description: 'Adults + kids pool', openTime: '06:00', closeTime: '20:00', slotMinutes: 60, capacity: 15, chargePerSlot: 0 },
    { society: society._id, name: 'Community Hall', description: 'Meetings and functions', openTime: '08:00', closeTime: '23:00', slotMinutes: 240, capacity: 1, chargePerSlot: 3000 },
  ]);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await AmenityBooking.create([
    { society: society._id, amenity: club._id, flatNo: 'A-102', bookedBy: res2._id, date: tomorrow, startTime: '18:00', endTime: '21:00', guests: 30, amount: 1500 },
    { society: society._id, amenity: gym._id, flatNo: 'A-101', bookedBy: res1._id, date: tomorrow, startTime: '06:00', endTime: '07:00', guests: 1, amount: 0 },
  ]);

  // Notices, polls, discussions
  await Notice.create([
    { society: society._id, title: 'Water supply interruption', body: 'Water supply will be off on Sunday 10 AM to 2 PM for tank cleaning.', category: 'maintenance', pinned: true, postedBy: admin._id },
    { society: society._id, title: 'Diwali celebration', body: 'Join us at the clubhouse on 20 Oct, 7 PM. Dinner and cultural programme.', category: 'event', postedBy: admin._id },
    { society: society._id, title: 'AGM meeting', body: 'Annual general meeting on 25 Oct at Community Hall, 11 AM. All owners requested to attend.', category: 'meeting', postedBy: admin._id },
  ]);
  await Poll.create({ society: society._id, question: 'Should we install EV charging points in basement parking?', options: [{ text: 'Yes', votes: [res1._id, res2._id] }, { text: 'No', votes: [res3._id] }, { text: 'Need more info', votes: [] }], createdBy: admin._id });
  await Discussion.create({ society: society._id, title: 'Good plumber recommendation?', body: 'Anyone knows a reliable plumber nearby?', createdBy: res2._id, replies: [{ by: res1._id, text: 'Mohan plumber, 98xxxxxx. Very reliable.' }] });

  // Children
  const kid = await Child.create({ society: society._id, flatNo: 'A-101', name: 'Aarav Verma', age: 8, parent: res1._id, allowedEscorts: ['School bus', 'Grandfather'] });
  await Child.create({ society: society._id, flatNo: 'B-201', name: 'Ishita Mehta', age: 11, parent: res3._id, allowedEscorts: ['School van'] });
  await ChildLog.create({ society: society._id, child: kid._id, action: 'exit', escort: 'School bus', loggedBy: guard1._id, at: new Date(Date.now() - 5 * 3600000) });
  await ChildLog.create({ society: society._id, child: kid._id, action: 'entry', escort: 'School bus', loggedBy: guard1._id, at: new Date(Date.now() - 1 * 3600000) });

  await Notification.create({ user: res1._id, title: 'Welcome to MyGate', message: 'Your society Green Valley Apartments is now live.', type: 'general' });

  console.log('\nSeed complete. Society code: GVA001');
  console.log('Logins (password: password123)');
  console.log('  admin    : admin@gva.com');
  console.log('  guard    : guard@gva.com');
  console.log('  resident : aman@gva.com (A-101), priya@gva.com (A-102), rohit@gva.com (B-201)');
  console.log('Demo passcodes: visitor 123456 (A-101), maid 111111, driver 222222');
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
