const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 50 },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, minlength: 6 },
        avatar: { type: String, default: '' },
    },
    { timestamps: true }
);

// Mongoose 9+: async pre-hooks resolve via promise — do NOT call next()
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublic = function () {
    return { _id: this._id, name: this.name, email: this.email, avatar: this.avatar };
};

module.exports = mongoose.model('User', userSchema);
