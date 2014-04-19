var tickers = 'USD,EUR,XAU,XAG,XPT,HPD';

var sql = "SELECT [CURRENCY_COD] ,[rate] ,[type_rate], PATINDEX('%'+[CURRENCY_COD]+'%','"+
	tickers + "') as ord FROM [INFRA].[dbo].[tfb_rates_bank] where CURRENCY_COD in ('" +
	tickers.split(',').join("','") + "') order by ord, [type_rate]";

var connect = new ActiveXObject("ADODB.Connection")
var wshShell = new ActiveXObject("WScript.Shell")
var sell_marker = 'SELL';
connect.Open( wshShell.RegRead("HKLM\\SOFTWARE\\INFRATEL\\Infra Communications Suite\\CurrentVersion\\Configuration\\ConnectString") );
var rst = connect.Execute(  sql );
PlayTFB(  "courses" );
while(! rst.EOF ) {
	
	if ( rst(2) == sell_marker ) {
		PlayTFB('SELL');
	} else {
		PlayTFB(rst(0));
	}
	SpeakCurrency( rst(1), 'RUR');
	WScript.Sleep( 500 );
	rst.MoveNext();
}


function PlayTFB( msg ) {
	Play( 'mr:TatFondBank_Currencies\\' + msg );
}

/*
function Play( txt ) {
	WScript.Echo( txt );
}

function SpeakCurrency( v, c ) {
	WScript.Echo( v,c );
}
*/