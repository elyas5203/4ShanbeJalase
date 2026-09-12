// routes/arshadRoutes.js
const express = require('express');
const router = express.Router();

// GET: نمایش صفحه لاگین
// این مسیر به آدرس /KaragahArshad/login پاسخ خواهد داد
router.get('/login', (req, res) => {
    // فایل arshad/login.ejs را از پوشه views رندر می‌کند
    res.render('arshad/login', {
        title: 'ورود به شبکه امن'
    });
});

router.get('/hub', (req, res) => {
    res.render('arshad/hub', {
        title: 'مرکز فرماندهی'
    });
});

module.exports = router;
