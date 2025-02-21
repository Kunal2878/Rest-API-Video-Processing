const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
  
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'File too large' });
    }
  
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error in the file'
    });
  };
  
  module.exports = {errorHandler};