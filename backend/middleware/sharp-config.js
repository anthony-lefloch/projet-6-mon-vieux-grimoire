const sharp = require('sharp');
const fs = require('fs');

module.exports = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const inputPath = req.file.path;
  const outputFilename = `optimized-${Date.now()}.webp`;
  const outputPath = `images/${outputFilename}`;

  sharp(inputPath)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(outputPath)
    .then(() => {
      fs.unlink(inputPath, () => {
        req.file.filename = outputFilename;
        req.file.path = outputPath;
        next();
      });
    })
    .catch(error => {
      res.status(500).json({ error });
    });
};