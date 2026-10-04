const express = require('express');
const fs = require('fs');
const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config');
const sharp = require('../middleware/sharp-config');
const router = express.Router();
const Book = require('../models/Book');

router.get('/', (req, res, next) => {
  Book.find()
    .then(books => res.status(200).json(books))
    .catch(error => res.status(400).json({ error }));
});

router.post('/', auth, multer, sharp, (req, res, next) => {
  const bookObject = JSON.parse(req.body.book);

  const book = new Book({
    ...bookObject,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  });

  book.save()
    .then(() => res.status(201).json({ message: 'Livre enregistré !' }))
    .catch(error => res.status(400).json({ error }));
});

router.get('/:id', (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then(book => res.status(200).json(book))
    .catch(error => res.status(404).json({ error }));
});

router.put('/:id', auth, multer, sharp, (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then(book => {
      if (book.userId !== req.auth.userId) {
        if (req.file) {
          fs.unlink(req.file.path, () => {
            console.log('Image non autorisée supprimée');
          });
        }

        return res.status(403).json({ message: 'Non autorisé !' });
      }

      const bookObject = req.file
        ? {
            ...JSON.parse(req.body.book),
            imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
          }
        : { ...req.body };

      if (req.file) {
        const filename = book.imageUrl.split('/images/')[1];

        fs.unlink(`images/${filename}`, () => {
          console.log('Ancienne image supprimée');
        });
      }

      Book.updateOne(
        { _id: req.params.id },
        { ...bookObject, userId: req.auth.userId, _id: req.params.id }
      )
        .then(() => res.status(200).json({ message: 'Livre modifié !' }))
        .catch(error => res.status(400).json({ error }));
    })
    .catch(error => res.status(404).json({ error }));
});

router.delete('/:id', auth, (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then(book => {
      if (book.userId !== req.auth.userId) {
        return res.status(403).json({ message: 'Non autorisé !' });
      }

      const filename = book.imageUrl.split('/images/')[1];

      fs.unlink(`images/${filename}`, () => {
        Book.deleteOne({ _id: req.params.id })
          .then(() => res.status(200).json({ message: 'Livre supprimé !' }))
          .catch(error => res.status(400).json({ error }));
      });
    })
    .catch(error => res.status(500).json({ error }));
});

router.post('/:id/rating', auth, (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then(book => {
      const alreadyRated = book.ratings.some(
        rating => rating.userId === req.auth.userId
      );

      if (alreadyRated) {
        return res.status(400).json({
          message: 'Vous avez déjà noté ce livre !'
        });
      }

      book.ratings.push({
        userId: req.auth.userId,
        grade: req.body.rating
      });

      const total = book.ratings.reduce(
        (sum, rating) => sum + rating.grade,
        0
      );

      book.averageRating = total / book.ratings.length;

      return book.save()
        .then(updatedBook => res.status(200).json(updatedBook))
        .catch(error => res.status(400).json({ error }));
    })
    .catch(error => res.status(404).json({ error }));
});

module.exports = router;