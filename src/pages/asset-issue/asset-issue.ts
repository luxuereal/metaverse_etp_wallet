import { Component } from '@angular/core';
import { IonicPage, NavController, AlertController, LoadingController, Loading, NavParams, Platform } from 'ionic-angular';
import { MvsServiceProvider } from '../../providers/mvs-service/mvs-service';
import { TranslateService } from '@ngx-translate/core';

@IonicPage()
@Component({
    selector: 'page-asset-issue',
    templateUrl: 'asset-issue.html',
})
export class AssetIssuePage {

    selectedAsset: any
    addresses: Array<string>
    balance: number
    decimals: number
    showBalance: number
    loading: Loading
    quantity: string
    rawtx: string
    passcodeSet: any
    addressbalances: Array<any>
    sendFrom: string
    secondaryissue_threshold: number;
    feeAddress: string
    passphrase: string
    etpBalance: number
    decimalsList: number[]
    symbol: string
    max_supply: string
    custom_max_supply: string;
    asset_decimals: number
    issuer_name: string
    description: string
    issue_address: string

    constructor(
        public navCtrl: NavController,
        private alertCtrl: AlertController,
        private loadingCtrl: LoadingController,
        public navParams: NavParams,
        private mvs: MvsServiceProvider,
        public platform: Platform,
        private translate: TranslateService) {

        this.selectedAsset = "ETP"
        this.sendFrom = 'auto'
        this.issue_address = navParams.get('avatar_address')
        this.feeAddress = 'auto'
        this.decimalsList = [0,1,2,3,4,5,6,7,8]
        this.max_supply = ''
        this.custom_max_supply = ''
        this.symbol = ''
        this.issuer_name = navParams.get('avatar_name')
        this.description = ''
        this.passphrase = ''

        //Load addresses
        mvs.getAddresses()
            .then((_: Array<string>) => {
                this.addresses = _
            })

        if(!(this.selectedAsset && this.selectedAsset.length))
            this.navCtrl.setRoot('AccountPage')

        //Load balances
        mvs.getBalances()
            .then((balances) => {
                let balance: any = balances[this.selectedAsset]
                this.balance = (balance && balance.available) ? balance.available : 0
                this.decimals = balance.decimals
                this.etpBalance = balances['ETP'].available
                this.showBalance = this.balance
                return this.mvs.getAddressBalances()
                    .then((addressbalances) => {
                        let addrblncs = []
                        if (Object.keys(addressbalances).length) {
                            Object.keys(addressbalances).forEach((address) => {
                                if (addressbalances[address][this.selectedAsset] && addressbalances[address][this.selectedAsset].available) {
                                    addrblncs.push({ "address": address, "balance": addressbalances[address][this.selectedAsset].available })
                                }
                            })
                        }
                        this.addressbalances = addrblncs
                    })
            })

    }

    ionViewDidEnter() {
        console.log('Asset issue page loaded')
        this.mvs.getAddresses()
            .then((addresses) => {
                if (!Array.isArray(addresses) || !addresses.length)
                    this.navCtrl.setRoot("LoginPage")
            })
    }

    onFromAddressChange(event) {
        if (this.sendFrom == 'auto') {
            this.showBalance = this.balance
        } else {
            if (this.addressbalances.length)
                this.addressbalances.forEach((addressbalance) => {
                    if (addressbalance.address == this.sendFrom)
                        this.showBalance = addressbalance.balance
                })
        }
    }

    onSendToAddressChange(event) {

    }

    validSecondaryissueThreshold = (threshold) => (threshold>=-1&&threshold<=100)

    validMaxSupply = (max_supply, asset_decimals) => max_supply == 'custom' || (max_supply > 0 && ((asset_decimals == undefined)||(Math.floor(parseFloat(max_supply) * Math.pow(10, asset_decimals))) <= 10000000000000000))

    validMaxSupplyCustom = (max_supply_custom, asset_decimals) => max_supply_custom > 0 && ((asset_decimals == undefined)||(Math.floor(parseFloat(max_supply_custom) * Math.pow(10, asset_decimals))) <= 10000000000000000)

    validDecimals = (asset_decimals) => asset_decimals >= 0 && asset_decimals <= 8

    validSymbol = (symbol) => (symbol.length > 2) && (symbol.length < 64) && (!/[^A-Za-z0-9.]/g.test(symbol))

    validName = (issuer_name) => (issuer_name.length > 0) && (issuer_name.length < 64) && (!/[^A-Za-z0-9.]/g.test(issuer_name))

    validDescription = (description) => (description.length > 0) && (description.length < 64)

    validPassword = (passphrase) => (passphrase.length > 0)

    validIssueAddress = this.mvs.validAddress

    cancel(e) {
        e.preventDefault()
        this.navCtrl.pop()
    }

    preview() {
        this.create()
            .then((tx) => {
            console.log('transaction details: '+tx)
                this.rawtx = tx.encode().toString('hex')
                this.loading.dismiss()
            })
            .catch((error)=>{
                this.loading.dismiss()
            })
    }

    create() {
        return this.showLoading()
            .then((addresses) => this.mvs.createIssueAssetTx(
                this.passphrase,
                this.toUpperCase(this.symbol),
                Math.floor(parseFloat(this.max_supply == 'custom' ? this.custom_max_supply : this.max_supply) * Math.pow(10, this.asset_decimals)),
                this.asset_decimals,
                this.issuer_name,
                this.description,
                this.secondaryissue_threshold,
                false,
                this.issue_address,
                (this.sendFrom != 'auto') ? this.sendFrom : null,
                undefined
            ))
            .catch((error) => {
                console.error(error)
                if (error.message == "ERR_DECRYPT_WALLET")
                    this.showError('MESSAGE.PASSWORD_WRONG','')
                else if (error.message == "ERR_INSUFFICIENT_BALANCE")
                    this.showError('MESSAGE.ISSUE_INSUFFICIENT_BALANCE','')
                else
                    this.showError('MESSAGE.CREATE_TRANSACTION',error.message)
                throw Error('ERR_CREATE_TX')
            })
    }

    confirm() {
        this.translate.get('ISSUE.CONFIRMATION_TITLE').subscribe((txt_title: string) => {
            this.translate.get('ISSUE.CONFIRMATION_SUBTITLE').subscribe((txt_subtitle: string) => {
                this.translate.get('ISSUE.CREATE').subscribe((txt_create: string) => {
                    this.translate.get('CANCEL').subscribe((txt_cancel: string) => {
                    const alert = this.alertCtrl.create({
                        title: txt_title,
                        subTitle: txt_subtitle,
                        buttons: [
                            {
                                text: txt_create,
                                handler: data => {
                                    // need error handling
                                    this.send()
                                }
                            },
                            {
                                  text: txt_cancel,
                                  role: 'cancel'
                            }
                        ]
                    });
                    alert.present(prompt)
                  });
              });
          });
      });
    }

    send() {
        this.create()
            .then((tx) => this.mvs.broadcast(tx.encode().toString('hex'), 1000000000))
            .then((result: any) => {
                this.navCtrl.pop()
                this.translate.get('SUCCESS_SEND_TEXT').subscribe((message: string) => {
                    this.showSent(message, result.hash)
                })
            })
            .catch((error) => {
                this.loading.dismiss()
                if(error.message=='ERR_CONNECTION')
                    this.showError('ERROR_SEND_TEXT','')
                else if (error.message == 'ERR_BROADCAST') {
                    this.translate.get('MESSAGE.ONE_TX_PER_BLOCK').subscribe((message: string) => {
                        this.showError('MESSAGE.BROADCAST_ERROR',message)
                    })
                }
            })
    }

    format = (quantity, decimals) => quantity / Math.pow(10, decimals)

    round = (val:number) => Math.round(val*100000000)/100000000

    showLoading() {
        return new Promise((resolve, reject) => {
            this.translate.get('MESSAGE.LOADING').subscribe((loading: string) => {
                this.loading = this.loadingCtrl.create({
                    content: loading,
                    dismissOnPageChange: true
                })
                this.loading.present()
                resolve()
            })
        })
    }

    showSent(text, hash) {
        this.translate.get('MESSAGE.SUCCESS').subscribe((title: string) => {
            this.translate.get('OK').subscribe((ok: string) => {
                let alert = this.alertCtrl.create({
                    title: title,
                    subTitle: text + hash,
                    buttons: [ok]
                })
                alert.present(prompt)
            })
        })
    }

    showAlert(text) {
        this.translate.get('MESSAGE.ERROR_TITLE').subscribe((title: string) => {
            this.translate.get('OK').subscribe((ok: string) => {
                let alert = this.alertCtrl.create({
                    title: title,
                    subTitle: text,
                    buttons: [ok]
                })
                alert.present(prompt)
            })
        })
    }

    toUpperCase(text) {
        let textUpperCase: string = ''
        for(let i=0;i<text.length;i++){
            textUpperCase = textUpperCase + text.charAt(i).toUpperCase()
        }
        return textUpperCase
    }

    showError(message_key, error) {
        this.translate.get(['MESSAGE.ERROR_TITLE', message_key, 'OK']).subscribe((translations: any) => {
            let alert = this.alertCtrl.create({
                title: translations['MESSAGE.ERROR_TITLE'],
                subTitle: translations[message_key],
                message: error,
                buttons: [{
                    text: translations['OK']
                }]
            });
            alert.present(alert);
        })
    }

}
