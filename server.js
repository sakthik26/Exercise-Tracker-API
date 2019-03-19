const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

var shortId = require('shortid');
const mongoose = require('mongoose');
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )
var schema = mongoose.Schema;
app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


var personSchema = new schema({
     name: String,
    id : {type: String, unique: true, default: shortId.generate},
   exercise: [{
    desc: String,
    duration: Number,
    date: Date}]
});

var Person = mongoose.model('Person',personSchema);

var createPerson = function(username,done){
  
  Person.findOne({name:username}, function(err,data){
   
    if(err){
     done(err)
    }
    else{
      if(data === null){
        var person = new Person({name:username,excercise:[]});
        
        person.save(function(err,data){
          if(err)
            done(err)
          else{
           done(null,data); 
          }
        })
        
      }
      else{
        done(null,'User already exists');
      }
      
      
    }
    
  })
}


app.post('/api/exercise/new-user', function(req,res){
  createPerson(req.body.username, function(err,data){
    if(err)
      res.end('Error Creating the user');
    else if(data === 'User already exists')
      res.end('User already exists');
    else if(data){
     res.json({name: data.name, id: data.id});
    }   
  })
});


const addExercise = (personId, activity, done) => {
  console.log(personId);
  Person.findOne({id:personId}, (err,data)=>{
    //add to array
    console.log(data);
    if (data == null){
      done(null,'notFound');
    }else{
        
      data.exercise.push(activity);
           
      //save
      data.save((err, data) => {
        if (err) {
          console.log(err);
          done(err) 
        } else { 
          done(null, data) 
        }
      });
    }
 });
};

app.post('/api/exercise/add',(req,res) => {
  let dateVar = '';
  if (req.body.date != ''){
    dateVar = new Date(req.body.date); 
  }
  
  let activity = {
    desc : req.body.desc,
    duration: req.body.duration,
    date: dateVar
  }
  addExercise(req.body.userId,activity,(err,saveData)=>{
    if(err){
      res.send({error:"Error, Please try again"});
    }else if (saveData === 'notFound'){
      res.send({"error":"User not found"})
    }else{
      res.send({"username":saveData.name,"description":activity.desc,"duration":activity.duration,"id":saveData.id,"date":activity.date});
    }
  })
});


function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

app.get('/api/exercise/log/:userId', function(req,res){
  
  var userId = req.params.userId;
  
  Person.findOne({id:userId}, function(err,data){
    if(data === null){
     res.end('User Not Found'); 
    }
    else{
      var results = data.exercise;
     var from = new Date(req.query.from);
      var to = new Date(req.query.to);
      var limit = Number(req.query.limit);
      
      if(isValidDate(to)){
       results = results.filter(function(exer){ return exer.date >= from && exer.date <= to }); 
      }
      else if(isValidDate(from)){
       results = results.filter(function(exer){ return exer.date >= from}); 
      }
      
      
      if(limit){
       results = results.slice(0,limit); 
      }
      
      res.json({exercise: results}); 
    }    
  })
  
})


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
