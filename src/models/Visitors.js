import mongoose from 'mongoose';

const visitorCountSchema = new mongoose.Schema({
    count: { type: Number, default: 0 }
});
 const VisitorCount = mongoose.model('VisitorCount', visitorCountSchema);

export default VisitorCount;
