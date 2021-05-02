const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");

const app = express();

app.set("view engine", "ejs")

app.use(bodyParser.urlencoded ({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser('secret'));
app.use(session({
	secret : 'something',
	resave: true,
	saveUninitialized: true,
	cookie: { maxAge : 60000 }
	}));
app.use(flash());

var clientId = 0;
var listName = "";
var checkedObj;
var listData;
var itemData;

mongoose.connect("mongodb+srv://agnaman:%23Chancer15@cluster0.wur5z.mongodb.net/newToDoListDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useFindAndModify', false);


const itemSchema = {
	name: {
		type: String,
		required: true
	}
}
const Item = mongoose.model("Item", itemSchema);


const headSchema = {
	name: {
		type: String,
		required: true
	},
	items: [itemSchema]
}
const Head = mongoose.model("Head", headSchema);


const listSchema = {
	_id: {
		type: Number,
		required: [true, 'Please Enter an Id'],
		min: 100000,
		max: 999999
	},
	lists: [headSchema]
}
const List = mongoose.model("List", listSchema);


app.get("/", function(req,res){
	res.render("home");
});

app.get("/createId", function(req, res){
	res.render("createId");
});

app.post("/createId", function(req, res){
	const newId = req.body.newId;
	
	const list = new List({
		_id: newId
	});
	list.save(function(err){
		if(err){
			if(err.name == 'ValidationError'){
				req.flash('error','Please Enter a 6 Digit ID');
				res.locals.message = req.flash();
				res.render("createId");
			}
			else{
				req.flash('error','ID already exists, try another');
				res.locals.message = req.flash();
				res.render("createId");
			}
		}
		else{
			res.redirect("/");
		}
	});
});

app.get("/enterId", function(req, res){
	res.render("enterId");
});

app.post("/enterId", function(req, res){
	clientId = req.body.clientId;
	List.findOne({_id: clientId}, function(err, data){
		if(err){
			req.flash('error','Please Enter a valid 6 Digit ID, if not created then create one');
			res.locals.message = req.flash();
			res.render("enterId");
		}else{
			res.redirect("/clientLists");
		}
	}).orFail();
});
 
app.get("/clientLists", function(req, res){
	List.findOne({_id: clientId}, function(err, data){
		if(err){
			console.log(err);
		}else{
			listData = data.lists
			res.render("clientLists", { clientLists : listData});
		}
	});
});

app.post("/clientLists", function(req, res){
	const newHead = req.body.newHead;
	const createHead = new Head({
		name: newHead
	});
	
	List.findOne({_id: clientId}, function(err, doc){
		if(err){
			console.log(err);
		}else{
			doc.lists.push(createHead);
			doc.save(function(error){
				if(error){
					req.flash('error','Wishlist must have a name');
					res.locals.message = req.flash();
					res.render("clientLists", { clientLists : listData});
				}else{
					res.redirect("/clientLists");
				}
			});
		}
	});
});

app.get("/lists/:paramName", function(req,res){
	listName = req.params.paramName;
	
	List.findOne({_id: clientId}, function(err, doc){
		if(err){
			console.log(err);
		}else{
			const eachList = doc.lists;
			eachList.forEach(function(data){
				if(data.name === listName){
					itemData = data.items;
					res.render("listItems", {listTitle : listName, listItems: itemData});
				}
			});
		}
	});

});

app.post("/lists/:paramName", function(req, res){
	const newItem = req.body.newItem;
	const createItem = new Item({
		name: newItem
	});
	
	List.findOne({_id: clientId}, function(err, doc){
		if(err){
			console.log(err);
		}else{
			const eachList = doc.lists;
			eachList.forEach(function(data){
				if(data.name === listName){
					data.items.push(createItem);  // bug - > keeps on iterating even when the condition is met should break down.
				}
			});
			doc.save(function(error){
				if(error){
					req.flash('error', 'Enter a name for the item');
					res.locals.message = req.flash();
					res.render("listItems", {listTitle : listName, listItems: itemData});
				}
				else{
					res.redirect("/lists/" + listName);
				}
			});
		}
	});
});

app.post("/deleteItem", function(req, res){
	const checkedItemId = req.body.checkbox;
	
	List.findOne({_id: clientId}, function(err, doc){
		if(err){
			console.log(err);
		}else{
			const eachList = doc.lists;
			eachList.forEach(function(data){
				if(data.name === listName){
					const fetchedItems = data.items;
					fetchedItems.forEach(function(foundItem){
						if(foundItem._id == checkedItemId){
							checkedObj = foundItem;
						}
					});
					const index = fetchedItems.indexOf(checkedObj);
					fetchedItems.splice(index, 1);   //index -> from which index  1 -> how many objects
				}
			});
			doc.save();
			res.redirect("/lists/" + listName);
		}
	});
});

app.post("/deleteList", function(req, res){
	const checkedListId = req.body.checkbox;
	
	List.findOneAndUpdate({_id: clientId}, {$pull : {lists : {_id : checkedListId}}}, function(err, foundItem){
		if(!err){
		res.redirect("/clientLists");
		}
	});
});


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function(){
	console.log("Server Started..");
});

