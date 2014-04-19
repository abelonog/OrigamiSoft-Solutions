var constants = {
	"absMode":"fake_multi", //possible values = real|fake_single|fake_multi
	"absURL": "http://delphin/UBS_ASP/esm/esm_get_data_bss.asp",
//	"absURL": "http://algea/ubs_asp/esm/esm_get_data_bss.asp",
	"absidseed":0,
	"passwordTimeout":6,
	"passwordAttempts":5,
	"passwordLength":3,
	"registerTimeout":15,
	"registerAttempts":5,
	"cardLength":4,
	"cardTimeout":15,
	"passportSeriaLen":4,
	"passportNumLen":6,
	"passportNumTimeout":10,
	"newPasswordAttempts":5,
	"newPasswordTimeout":15,
	"changePasswordTimeout1":9,
	"changePasswordTimeout2":6,
	"attempts":3,
	"changePinTimeout":12,
	"pinLen":4,
	"smspattern" : "Ваш пароль для входа в ТФБ-консультант: %PASSWORD%",
	"smspassword" : "safarix",
	"smsuser" : "Tfbtest2",
	"smssource" : "TESTSMS", 
	"emailto": "contact@tfb.ru",
	"emailfrom": "tfb-consultant@tfb.ru",
	"emailsubject":"INFRATEL Telebank ABS %request% error : %code%",
	"emailbody":"INFRATEL Telebank ABS request %request% failed\n\rerror code : %code%\n\rUser guid : %guid%",
	"registrypath": "HKLM\\SOFTWARE\\INFRATEL\\Solutions\\Telebank\\",
	"maxDailyAttemptsCount":3,
	"branches" : { 
		"cards" : 1, 
		"router" : 2, 
		"queue" : 3, 
		"dailyAttempts" : 4, 
		"pinChangeError" : 5, 
		"failure" : 99
	},
	"smtp" : {
		"smtpserver":"192.168.0.174",
		"sendusing": 2,
		"smtpserverport" : 25,
		// remove the following if your SMTP server does not authenticate requests
		"smtpauthenticate" : 1,
		"sendusername" : "tfb-consultant",
		"sendpassword" : "consul753951",
		"smtpusessl" : 0
	},
	"phoneformats" : [
		{  
			"lenmin": 13,
			"lenmax": 13,
			"prefix":"008",				
			"remove":3,				
			"prepend":"7"
		},
		{  
			"lenmin": 9,
			"lenmax": 9,
			"prefix":"00",				
			"remove":2,				
			"prepend":"7843"
		},
		{  
			"lenmin": 8,
			"lenmax": 8,
			"prefix":"0",				
			"remove":1,				
			"prepend":"7843"
		},
		{  
			"lenmin": 7,
			"lenmax": 7,
			"prefix":"",				
			"remove":0,				
			"prepend":"7843"
		},
		{  
            "lenmin": 10,
			"lenmax": 10,
			"prefix":"",				
			"remove":0,				
			"prepend":"7"
		},
		{  
		    "lenmin": 11,
			"lenmax": 999,
			"prefix":"7",
			"remove":0,				
			"prepend":""
		},
		{  
			"lenmin": 11,
			"lenmax": 999,
			"prefix":"8",
			"remove":1,				
			"prepend":"7"
		},
		{  
			"lenmin": 12,
			"lenmax": 999,
			"prefix":"08",
			"remove":2,				
			"prepend":"7"
		},
	],
	"mobilePrefixes": [ "79", "7495" ], //if 79 is not precise enough - just replace it with list like "7926","7916",....
	"creditContractIDLength":"14",
	"enterContractIDTimeout":"45"
};
var IS_MOCKUPS_ON=true; //Enable and disable mockups to ignore 3d parties system connectivity. 
						//This scrip will not send request outside whenIS_MOCKUPS_ON=true

String.prototype.lpad = function(padString, length) {
	var str = this;
    while (str.length < length)
        str = padString + str;
    return str;
}
PlaySettings.IsStoppable = true;
PlaySettings.ClearDigitsBuffer = 0;
var callerid = null;
var utils = new ActiveXObject("Infratel.SecurityUtils");
var abs = constants.absMode=="real"? new ABSProxy(): new ABSFake(constants.absMode=="fake_multi");
var db = new KeyValueDB( constants.registrypath );

switch( MenuTFB( "EntryMenu","12",3 ) ) {
	case "1":
		Play("Info");
		Branch = constants.branches.cards;
		break;
	case "2":
		TFBConsultant();
		break;
	default:
		Branch = constants.branches.failure;
}

function trace( txt ) {
	OutputDebugString( "telebank:" + txt +"\n" , true );
}
function IsMobileNumber( num ) {
	for( var i=0;i<constants.mobilePrefixes.length;++i ) {
		var prefix = constants.mobilePrefixes[i];
		if ( num.substr(0,prefix.length) == prefix ) {
			return true;
		}
	}
	return false;
}

function TFBConsultant() {
	var phone = GetCallerID();
	if ( IsMobileNumber( phone )  ){
		var info = db.getUserInfoByPhone( phone );
		var mustContinue = true;
		while( mustContinue ) {
			mustContinue = false;		
			switch( MenuTFB( "RegistrationMenu","123#",constants.attempts) ) {
				case "1":{
					if ( info ) {
						Login( info );
					} else {
						PlayTFB( "NotRegistered" );
						mustContinue = true;		
					}
		
				} break;
				case "2":{
					PlayAndRegister();
				} break;
				case "3":{
					Register();
				} break;
				default: //#attempts limit + #
					Branch = constants.branches.router;
				}
		}
	} else {
		PlayTFB("MobileRequired")
		Branch = constants.branches.router;
	}
}

function PlayAndRegister() {
	trace("PlayAndRegister1");
	var attempts = constants.registerAttempts;
	while( attempts-- ) {
		if ( attempts!=constants.registerAttempts-1) {
			PlayTFB("WrongData");
			PlayTFB("RepeatAttempt");
		}
	
		//var card = PlayAndCollectTFB("RegisterNewPrivateOffice",constants.creditContractIDLength, constants.enterContractIDTimeout);	
		
		//4 - last digit on credit card
		//14 - credit contract id
		var len = [4,14];
		
		var card = PlayAndCollectValuesTFB("RegisterNewPrivateOffice", len, 5, 4, "#");
		
		if ( card.length<constants.cardLength ) {
			continue;
		}
		var series = PlayAndCollectTFB("EnterPassportSeries",constants.passportSeriaLen, constants.registerTimeout);	
		if ( series.length<constants.passportSeriaLen ) {
			continue;
		}
		var num = PlayAndCollectTFB("EnterPassportNumber",constants.passportNumLen, constants.passportNumTimeout);	
		if ( num.length<constants.passportNumLen ) {
			continue;
		}
		var res = abs.getUserGuid( card, "" + series + num );
		if ( res.code == 6 ) {
			continue;
		}
		if ( res.code == 0 ) {
			ChoosePassword( res.GUID_CLIENT, card, "" + series + num );
			return;			
		}
		SendEmail( { "code" : res.code, "request": "GET_GUID_CLIENT" } );
		return;
	}

	PlayTFB("YourCallGoesToOpearator");
	Branch = constants.branches.queue;
}

function ChoosePassword( guid, card, passp ) {
	var attempts = constants.newPasswordAttempts;
	while( attempts-- ) {
		if ( attempts!=constants.newPasswordAttempts-1) {
			 PlayTFB("RepeatAttempt");
		}
		var pwd = PlayAndCollectTFB("CompleteRegister",constants.passwordLength, constants.newPasswordTimeout);	
		if ( pwd.length<constants.passwordLength ) {
			continue;
		}
		var phone = GetCallerID();
		var userInfo  = GetUserInfo(  GetPasswordHash( pwd, phone ), guid );
		db.setUserInfo( phone, userInfo );
		SendSMS( phone, pwd );
		Main( userInfo );	
		return;
	}
	StopEvent.Fire();
}


function CheckAndSendError( range, guid, res ) {
	if ( res.code ) {
		if ( (typeof(range)=="boolean" && range) || (res.code>=range[0] && res.code<=range[1]) ) {
				PlayTFB("SystemUnresponsive");
				SendEmail( {"code":res.code, "request": res.method, "guid":guid} );
			}
		
	}
	return res.code==0;
}

function SpeakBalance( value, cur ) {
	PlayTFB("CardBalanceIs");
	SpeakCurrency( value, cur.replace("RUB","RUR") );
}

function SendSMS( phone, pwd ) {
	var session = eval(Get( "https://integrationapi.net/rest/User/SessionId?login=" + constants.smsuser + "&password=" + constants.smspassword));
	Post( "https://integrationapi.net/rest/Sms/Send","sessionId=" + session + "&sourceAddress=" + constants.smssource + "&destinationAddress=" + phone.replace("+","") + "&data=" + constants.smspattern.replace("%PASSWORD%",pwd) );
}


function Get( url ) {
	Hold();
	var ret = utils.SendRequest(url, "GET","");
	Unhold();
	return ret;
}

function Post( url, req ) {
	Hold();
	var ret = utils.SendRequest(url, "POST",req);
	Unhold();
	return ret;
}


function GetSecurity() {
	return utils;
}
var installHelper = null;
function GetInstallHelper() {
	if ( !installHelper ) {
		installHelper = new ActiveXObject("INFra.Install.Helper");
	}
	return installHelper;
}
function EncryptPIN( pin, card ) {
	var s = GetInstallHelper().UnprotectString( GetShell().RegRead( constants.registrypath + "PinPassword" ) );
	return GetSecurity().CreatePINBlock(pin, card, s ).toUpperCase();
}
function GetPasswordHash( pwd, phone ) {
	var salt = ">lk\,gh?aqlo!zd";
	return GetSecurity().MD5WithSalt( pwd, salt + phone );
}

function FindCard( card, cards ) {
	for( var i=0;i<cards.length; ++i ) {
		if ( cards[i].CN==card ) {
			return cards[i];
		}
	}	
	return null;
}
function RequestCard( info, cards ) {
	var card = PlayAndCollectTFB("EnterCardDigits",constants.cardLength, constants.cardTimeout );	
	if ( card.length != constants.cardLength || !FindCard(card,cards) ) {
		PlayTFB("WrongData");
		return;		
	}
	var res = abs.getCardBalance( info.guid, card );
	if ( CheckAndSendError( [1,7], info.guid,  res )  ){
		SpeakBalance( res.REST, res.CUR );
	}
}

function ChangePassword( info ) {
	var pwd = PlayAndCollectTFB("EnterNewPassword",constants.passwordLength, constants.changePasswordTimeout1 );	
	if ( pwd.length<constants.passwordLength ) {
		return;
	}
	var pwd1 = PlayAndCollectTFB("ReEnterNewPassword",constants.passwordLength, constants.changePasswordTimeout2 );	
	if ( pwd!=pwd1) {
		PlayTFB("PasswordsDiffer")
		return;
	}
	var phone = GetCallerID();
	db.setUserInfo( phone, GetUserInfo( GetPasswordHash( pwd, phone ), info.guid ) );
	PlayTFB("PasswordChanged");
	SendSMS( phone, pwd );
}

function ChangePIN( info ) {
	while( true ) {
		var card = PlayAndCollectTFB("EnterCardDigits",constants.cardLength, constants.cardTimeout );	
		if ( card.length != constants.cardLength ) {
		}
		var pin = PlayAndCollectTFB("ChangePIN",constants.pinLen, constants.changePinTimeout1 );	
		if ( pin.length<constants.pinLen ) {
			continue;
		}
		var pin1 = PlayAndCollectTFB("RepeatPIN",constants.pinLen, constants.changePinTimeout2 );	
		if ( pin1!=pin ) {
			PlayTFB("PINsDiffer");
			continue;
		}
		var res = abs.getUserCards( info.guid );
		if ( !CheckAndSendError( [1,5], info.guid, res )  ) {
			return;
		}

		var cards = res.CARDS[0].N;
		for( var i=0;i<cards.length;++i ) {
			if ( cards[i].CN == card ) {
				var res = abs.setCardPin( info.guid, cards[i].CN, EncryptPIN( pin, cards[i].CNUM ), GetCallerID() );
				if ( CheckAndSendError( res.code==9 || (res.code>=1 && res.code<=6), info.guid, res ) ) {
					PlayTFB("ChangePINSuccess");
				}
				if ( res.code == 8 ) {
					PlayTFB("PINAlreadyChanged");
				}
				if ( res.code == 7 ) {
					break;
				}
				if ( res.code == 10 ) {
					WScript.Quit(constants.branches.pinChangeError);
				}
				return;		
			}
		}
		PlayTFB("WrongCardNumber");
		return;
	}
	
}

function Main( info ) {        
	while( true ) {
	switch( MenuTFB( "MainMenu","123#",3 ) ) {
		case "1": { //balance
			var phone = GetCallerID();
			var attempts = db.getAttempts(phone);
			db.setAttempts(phone, attempts+1);
			if ( attempts>=constants.maxDailyAttemptsCount ) {
				WScript.Quit( constants.branches.dailyAttempts );	
			}
			var res = abs.getUserCards( info.guid );
			if ( !CheckAndSendError( [1,5], info.guid, res ) ) {
				continue;
			}
			var cards = res.CARDS[0].N;
			if ( cards.length == 1 ) {
				SpeakBalance( cards[0].REST, cards[0].CUR );
			} else {
				RequestCard( info, cards );
			}
			} break;
		case "2": {//change password
			ChangePassword( info );
			} break;
		case "3": {//change PIN
			ChangePIN( info );
			} break;
		case "#": {
			Quit( constants.branches.router );
			return;
		} break;
	}
	}
}

function ReplacePattern( pattern, params ) {
	var txt = pattern;
	for( var n in params) {
		txt = txt.replace("%" + n + "%", params[n] );
	}
	txt = txt.replace("%guid%", "");
	return txt;
}

function SendEmail( params ) {
	var msg = CreateMessage( ReplacePattern(constants.emailsubject, params),ReplacePattern(constants.emailbody, params) );
	msg.Send();
}

function CreateMessage(subject, body ) {
	var iMsg = new ActiveXObject("CDO.Message");
	var iConf = new ActiveXObject("CDO.Configuration");
	var fields =  iConf.Fields;
	for( var n in constants.smtp ) {
		fields.Item("http://schemas.microsoft.com/cdo/configuration/" + n ) = constants.smtp[n];
	}
	fields.Update();
	iMsg.Configuration = iConf;
	iMsg.To       = constants.emailto;
	iMsg.From       = constants.emailfrom;
	iMsg.Subject  = subject;
	iMsg.TextBody = body;
	return iMsg;
}

function Login( info ) {
	var attempts = constants.passwordAttempts;
	while( attempts-- ) {
		var pwd = PlayAndCollectTFB("EnterPassword",constants.passwordLength, constants.passwordTimeout);	
		if ( pwd!="" && pwd.length == constants.passwordLength) {
			var hash = GetPasswordHash( pwd, GetCallerID() );
			if ( hash == info.passwordHash ) {
				Main( info );
			} else {
				if ( MenuTFB( "WrongPasswordEnterAgain","12" ) == 2 ) {
					Register();
					break;
				}
			}
		}
	}
	PlayTFB("YourCallGoesToOpearator");
	Branch = constants.branches.queue;
}

function GetTFBPrompt( msg ) {
	return 'mr:TatFondBank_Telebank\\' + msg;
}

function PlayTFB( msg ) {
	Play(  GetTFBPrompt( msg ) );
}

function MenuTFB( msg, choices, attemptsIn ) {
	var attempts = attemptsIn?attemptsIn:constants.attempts;
	while( attempts-- ) {
		var ret = PlayAndCollectTFB(  msg , 1 );
		if ( ret!="" && choices.indexOf( ret )!=-1 ) {	
		 	return ret;
		}
	}
}

function GetVPBXCall( ) {
	var IID_IVPBXCallAccess = "{A45D47A1-0B60-48b6-A57D-D13863F5DDF2}";
	var vca = QueryDispatchInterface( IID_IVPBXCallAccess, Session.TAPIContext.Call )
	return  vca.VPBXCall;

}
function FormatCallerID(id) {
//		OutputDebugString ("\nBEFOREFORMAT: " + id + "\n");
		for( var i=0;i<constants.phoneformats.length;++i ) {
			var f = constants.phoneformats[i];
			if ( id.length>= f.lenmin && id.length<= f.lenmax && id.substr(0,f.prefix.length)==f.prefix ) {
				return f.prepend + id.substr(f.remove);
			}
		}
	return id;
}

function GetCallerID() {
	if (!callerid ) {
	 	callerid = FormatCallerID(GetVPBXCall().PartyID);
	}
//	OutputDebugString ( "\nAFTERFORMAT: " + callerid + "\n");
	return callerid;
}

function PlayAndCollectTFB( msg, len, timeout ) {
	var oldTimeout;
	if ( timeout ) {
		oldTimeout = CollectSettings.FirstDigitTimeout;
		CollectSettings.FirstDigitTimeout = timeout;
	}
	var ret = PlayAndCollect( GetTFBPrompt( msg ) , len );
	if ( timeout ) {
		CollectSettings.FirstDigitTimeout = oldTimeout;
	}
	return ret;
}
/*
message - AVR file
lengths - массив размеров, ожидаемых чисел
timeout - таймаут на ввод первого числа
terminatingDigits - символ окончания ввода
*/
function PlayAndCollectValuesTFB( message, lengths, timeout, nextDigitTimeout, terminatingDigits ) {
	var oldTimeout;
	var oldNextDigitTimeout;
	var buffer = "";
	var ret = "";
	var digit;
	var doNext = true;
	var attempts = Math.max.apply(Math, lengths); //max attempts is max value from array [lengths]
	
	if ( timeout ) {
		oldTimeout = CollectSettings.FirstDigitTimeout;
		CollectSettings.FirstDigitTimeout = timeout;
	}

	if ( nextDigitTimeout ) {
		oldNextDigitTimeout = CollectSettings.NextDigitTimeout;
		CollectSettings.NextDigitTimeout = nextDigitTimeout;
	}
	
	PlayTFB(message);
	
	while(doNext){
		attempts--;
		digit = PlayAndCollect( null , "1" );
		//trace("digit: " + digit);
		if(digit == "" || digit == terminatingDigits || attempts <= 0){
			//сивмол окончания ввода или таймаут
			doNext = false;
			//trace("END");
		}else{
			//символ числа
			doNext = true;
			buffer += digit;
			//trace("buffer: "+buffer);
		}		
	}
	
	//проверить buffer на совпадение ожидаемой длины
	for(var len in lengths){
		trace("len: "+lengths[len]);
		trace("buffer.length: "+buffer.length);
		//закончить если дина совпадает и 
		//( максимальная длина достигнута или встретился маркер окончания ввода )
		if(!doNext && buffer.length == lengths[len]){
			ret = buffer;
			break;
		}
	}	
	//trace("ret: "+ret);
	if ( timeout ) {
		CollectSettings.FirstDigitTimeout = oldTimeout;
	}
	if ( nextDigitTimeout ) {
		CollectSettings.FirstDigitTimeout = oldNextDigitTimeout;
	}
	return ret;
}

function ABSProxy() {
	function GenerateUniqueID() {
		var id = ++constants.absidseed;
		return "INFRATEL_" + new Date().valueOf() + '_' + id;
	}

	function Params2Attributes( params ) {
		var ret = "";
		for( var n in params ) {
			ret+=' ' + n + '="' + params[n] +'"';
		}
		return ret;
	}

	function JsonifyXML( node ) {
		if(node.nodeType == 1 ) { // DOMNodeTypes.ELEMENT_NODE
			var result = {};
			var nodeChildren = node.childNodes;
			for(var cidx=0; cidx <nodeChildren.length; cidx++) {
				var child = nodeChildren.item(cidx); // nodeChildren[cidx];
				var childName = child.nodeName;
				if ( child.nodeType==1 || child.nodeType==2 ) {
					var c = JsonifyXML(child);
					if ( result[childName] ) {
						result[childName].push( c );
					} else {
						result[childName] = child.nodeType==1?[c]:c;
					}
				}
			}
			for( var i = 0;i < node.attributes.length;++i ) {
				var a = node.attributes[i];
				result[a.nodeName] = a.nodeValue;
			}

			return result;
		}
		
	}

	function ISODateString(d){
	 function pad(n){return n<10 ? '0'+n : n}
	 return d.getUTCFullYear()+'-'
	      +pad(d.getUTCMonth()+1)+'-'
	      + pad(d.getUTCDate())+'T'
	      + pad(d.getUTCHours())+':'
	      + pad(d.getUTCMinutes())+':'
	      + pad(d.getUTCSeconds())+'Z'
	}


	function Query( request, params ) {
		var now = new Date();
		var req = '<?xml version="1.0" encoding="windows-1251"?><x:BSMessage xmlns:x="IT_R_' + request + '" Version="STD1.0" ID="' + GenerateUniqueID() + '" ReqDateTime="' + ISODateString(now) + '"><BSHead CustomerID="0" SubSys="INFRATEL"/><BSRequest  ' + Params2Attributes( params )  + ' /></x:BSMessage>'
		var xmldom = new ActiveXObject("MSXML2.DOMDocument");
		xmldom.async = false;
		xmldom.loadXML( Post(constants.absURL,req) );

		var res = xmldom;
		var error = res.selectSingleNode("x:BSMessage/BSHead/Errors/m");
       		var response = JsonifyXML( res.selectSingleNode("x:BSMessage/BSAnswer") );
		response["code"] = Number(error.getAttribute("e"));
		response["method"] =  request;
		return response;
	}

	

	this.getUserGuid = function( cardNum, passpNum ) {
		return Query( "GET_GUID_CLIENT", { "N":cardNum, "PASSP":passpNum } );
	}
	this.getUserCards = function( userGuid ) {
		return Query( "GET_CARDS_CLIENT", { "GUID_CLIENT": userGuid } );
	}
	this.setCardPin = function( userGuid, cardNum, cardPIN, phone ) {
		return Query( "CHANGE_PIN_FORCE", { "GUID_CLIENT": userGuid, "N":cardNum, "PIN_BLOCK": cardPIN,"PHONE":phone } );
	}
	this.getCardBalance = function( userGuid, cardNum ) {
		return Query( "GET_BALANCE_CARD", { "GUID_CLIENT": userGuid, "N":cardNum } );
	}
}

function ABSFake( many ) {
	function getCards( n ) {
		var ret = [];
		for(var i=6005;i<6005+n;++i ) {
			ret.push( { "CN" : "" + i, "CUR" : "RUB", "CNUM" : "12345678912" +i ,"REST" : i+ i/10+ i/100 } );
		}
	        return ret;
	}
	this.getUserGuid = function( cardNum, passpNum ) {
		return { "method" : "GET_GUID_CLIENT", "code":0, "GUID_CLIENT":"{7F58AF95-185F-48AD-B69D-1463F847EF35}" };
	}
	this.getUserCards = function( userGuid ) {
		var cnt = (many?2:1);
		return { "method" : "GET_CARDS_CLIENT", "code":0, "CNT_CARDS":cnt, "CARDS":[ { "N": getCards( cnt ) } ] };
	}
	this.setCardPin = function( userGuid, cardNum, cardPIN, phone ) {
		return { "method" : "CHANGE_PIN_FORCE", "code":0 };
	}
	this.getCardBalance = function( userGuid, cardNum ) {
		return { "method" : "GET_BALANCE_CARD", "code":0, "REST":342.22, "CUR":"RUB" };
	}
}



function GetUserInfo( hash, guid ) {
	return { "passwordHash":hash, "guid":guid };
}
var shell = null;
function GetShell() {
	if ( !shell ) {
		shell = new ActiveXObject("WScript.Shell");
	}
	return shell;
}


function KeyValueDB( registryStore ) {
	var _shell = GetShell();

	function GetKey( phone ) {
//		OutputDebugString ("\nLPAD: " + phone + "\n");
		phone = phone.lpad("0",10);
		return registryStore+ "db\\" + phone.substr(0,4) + "\\" + phone.substr(4,3) + "\\" + phone.substr(7) +'\\';
	} 
	
	this.getAttempts = function( phone ) {
		var key = GetKey( phone );	
		try {
			var d = _shell.RegRead(key + "balance_date")
			if ( d!=GetDateString() ) {
				return 0;
			}
			return Number(_shell.RegRead(key + "balance_attempts"));
		} catch( e ) {
			return 0;
		}
	}

	this.setAttempts = function( phone, attempts) {
		var key = GetKey( phone );	
		_shell.RegWrite( key + "balance_date", GetDateString() );
		_shell.RegWrite( key + "balance_attempts", attempts.toString() );
	}

	
	this.getUserInfoByPhone = function( phone ) {
		var key = GetKey( phone );	
		try {
			return GetUserInfo(  _shell.RegRead(key + "hash"), _shell.RegRead(key + "guid") );
		} catch( e ) {
			return null;
		}
	}

	this.setUserInfo = function( phone, ui ) {
		var key = GetKey( phone );	
		_shell.RegWrite( key + "hash", ui.passwordHash );
		_shell.RegWrite( key + "guid", ui.guid );
	}
	function GetDateString() {
		var d = new Date();
		return d.getFullYear().toString() + (d.getMonth()+1).toString().lpad("0",2) + d.getDate().toString().lpad("0",2);
	}		
}
