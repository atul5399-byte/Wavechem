const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Session
app.use(session({
    secret: 'wavechem-secret',
    resave: false,
    saveUninitialized: true
}));

// Visitor counter file
const visitorFile = path.join(__dirname, 'visitors.json');
if (!fs.existsSync(visitorFile)) fs.writeFileSync(visitorFile, JSON.stringify({ count: 0 }));

// Increment visitor count on student routes
app.use('/student', (req, res, next) => {
    let data = fs.readFileSync(visitorFile, 'utf-8');
    let json = JSON.parse(data);
    json.count += 1;
    fs.writeFileSync(visitorFile, JSON.stringify(json, null, 2));
    next();
});

// ================= Student Routes =================

// Student homepage
app.get('/student', (req, res) => {
    res.render('students/index');
});

// Materials for each class
app.get('/student/materials/:classId', (req, res) => {
    const classId = req.params.classId;
    let className = '';

    switch(classId){
        case '11': className = 'Class 11'; break;
        case '12': className = 'Class 12'; break;
        case 'jee': className = 'JEE'; break;
        case 'neet': className = 'NEET'; break;
        default: className = 'Unknown Class';
    }

    const dir = path.join(__dirname, 'public', 'uploads', classId);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];

    // Pass folder name for links
    res.render('students/materials', { className, files, classNameFolder: classId });
});

// ================= Admin Routes =================

// Admin login page
app.get('/admin/login', (req, res) => {
    res.render('admin/login');
});

// Admin login POST
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if(username === 'admin' && password === '1234'){
        req.session.isAdmin = true;
        res.redirect('/admin/upload');
    } else {
        res.send('Invalid credentials!');
    }
});

// Admin logout
app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// Multer setup for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const classFolder = req.body.className;
        const dir = path.join(__dirname, 'public', 'uploads', classFolder);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Admin upload page
app.get('/admin/upload', (req, res) => {
    if(!req.session.isAdmin) return res.redirect('/admin/login');

    const classes = ['11','12','jee','neet'];
    const filesPerClass = {};

    classes.forEach(cls => {
        const dir = path.join(__dirname, 'public', 'uploads', cls);
        filesPerClass[cls] = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    });

    // Read visitor count
    const visitorData = fs.readFileSync(visitorFile, 'utf-8');
    const visitorJson = JSON.parse(visitorData);
    const visitorCount = visitorJson.count;

    res.render('admin/upload', { filesPerClass, visitorCount });
});

// Upload POST
app.post('/admin/upload', upload.single('materialFile'), (req, res) => {
    if(!req.session.isAdmin) return res.redirect('/admin/login');
    res.redirect('/admin/upload');
});

// Delete file
app.post('/admin/delete', (req, res) => {
    if(!req.session.isAdmin) return res.redirect('/admin/login');
    const { className, filename } = req.body;
    const filePath = path.join(__dirname, 'public', 'uploads', className, filename);
    if(fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.redirect('/admin/upload');
});

// ================= Home Route =================
app.get('/', (req, res) => {
    res.redirect('/student'); // Redirect to student page
});

// Start server
app.listen(PORT, () => {
    console.log(`WaveChem app running at http://localhost:${PORT}`);
});
