import UIKit
import MobileCoreServices
import UniformTypeIdentifiers

// MARK: - Theme
enum Theme {
    static let bgTop = UIColor(red: 11/255, green: 12/255, blue: 38/255, alpha: 1.0)
    static let bgBottom = UIColor(red: 5/255, green: 6/255, blue: 22/255, alpha: 1.0)
    static let cardBg = UIColor(red: 17/255, green: 20/255, blue: 58/255, alpha: 1.0)
    static let purple = UIColor(red: 168/255, green: 85/255, blue: 247/255, alpha: 1.0)
    static let violet = UIColor(red: 139/255, green: 92/255, blue: 246/255, alpha: 1.0)
    static let pink = UIColor(red: 217/255, green: 70/255, blue: 239/255, alpha: 1.0)
    static let hotPink = UIColor(red: 255/255, green: 51/255, blue: 102/255, alpha: 1.0)
    static let blue = UIColor(red: 96/255, green: 110/255, blue: 255/255, alpha: 1.0)
    static let lilac = UIColor(red: 196/255, green: 160/255, blue: 255/255, alpha: 1.0)
    static let yellow = UIColor(red: 251/255, green: 191/255, blue: 36/255, alpha: 1.0)

    // Rounded system font (mockup jaisa soft look)
    static func font(_ size: CGFloat, _ weight: UIFont.Weight) -> UIFont {
        let base = UIFont.systemFont(ofSize: size, weight: weight)
        if let descriptor = base.fontDescriptor.withDesign(.rounded) {
            return UIFont(descriptor: descriptor, size: size)
        }
        return base
    }
}

// MARK: - Pro gate (App Group se main app ka pro status padhta hai)
enum ProGate {
    static let appGroup = "group.com.socialgenius.app2026"
    static var isPro: Bool {
        UserDefaults(suiteName: appGroup)?.string(forKey: "is_pro_user") == "true"
    }
}
@objc(ActionViewController)
class ActionViewController: UIViewController {

    // MARK: - Layout
    let backgroundGradient = GradientView()
    let scrollView = UIScrollView()
    let contentStack = UIStackView()

    // Header
    let crownView = UIImageView()
    let titleLabel = UILabel()
    let subtitleLabel = UILabel()
    let closeButton = UIButton(type: .system)

    // Message card
    let messageSection = UIView()
    let messageBadge = PillView(text: "SELECTED MESSAGE", icon: "bubble.left.fill", color: Theme.pink)
    let selectedTextLabel = UILabel()

    // Perspective (analyze se pehle)
    let perspectiveLabel = UILabel()
    let perspectiveStack = UIStackView()
    let perspectiveBlock = UIStackView()
    let myMessageBtn = UIButton(type: .system)
    let theirMessageBtn = UIButton(type: .system)

    // Loading
    let loadingProgressView = LoadingProgressView()

    // Verdict card
    let verdictCard = UIView()
    let mascotImageView = UIImageView()
    let mascotEmojiLabel = UILabel()
    let scoreRing = ScoreRingView()
    let verdictPill = VerdictPillView()
    let whatPill = PillView(text: "WHAT THIS MEANS", icon: "exclamationmark.triangle.fill", color: Theme.pink)
    let headingLabel = UILabel()
    let bodyLabel = UILabel()
    let tipBox = UIView()
    let tipLabel = UILabel()

    // Replies
    let replySection = UIStackView()
    let replyHeaderLabel = UILabel()
    let seeMoreButton = UIButton(type: .system)
    let replyListStack = UIStackView()

    // Buttons
    let regenerateButton = GradientButton(colors: [Theme.purple, Theme.violet])
    let regenerateSpinner = UIActivityIndicatorView(style: .medium)
    let actionButton = GradientButton(colors: [Theme.pink, Theme.purple])

    // MARK: - State
    var extractedText: String = ""
    var selectedPerspective: String = ""
    var replies: [[String: Any]] = []
    var replyRows: [ReplyRow] = []
    var hasGenerated: Bool = false
    var isRegenerating: Bool = false
    var isExpanded: Bool = false
    /// Itne replies se zyada hon to "See more" dikhega (mockup me 5 dikhte hain)
    let collapsedCount = 5

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        extractSharedText()
    }

    // MARK: - Setup
    func setupUI() {
        view.backgroundColor = Theme.bgBottom

        backgroundGradient.translatesAutoresizingMaskIntoConstraints = false
        backgroundGradient.gradientLayer.colors = [Theme.bgTop.cgColor, Theme.bgBottom.cgColor]
        backgroundGradient.gradientLayer.startPoint = CGPoint(x: 0.5, y: 0)
        backgroundGradient.gradientLayer.endPoint = CGPoint(x: 0.5, y: 1)
        view.addSubview(backgroundGradient)

        scrollView.showsVerticalScrollIndicator = false
        scrollView.alwaysBounceVertical = true
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scrollView)

        contentStack.axis = .vertical
        contentStack.spacing = 16
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        scrollView.addSubview(contentStack)

        buildHeader()
        buildMessageSection()
        buildPerspectiveBlock()
        buildLoading()
        buildVerdictCard()
        buildReplySection()
        buildButtons()

        NSLayoutConstraint.activate([
            backgroundGradient.topAnchor.constraint(equalTo: view.topAnchor),
            backgroundGradient.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            backgroundGradient.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            backgroundGradient.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            scrollView.topAnchor.constraint(equalTo: view.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            contentStack.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor, constant: 8),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor, constant: 16),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor, constant: -16),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor, constant: -28),
            scrollView.contentLayoutGuide.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor),
        ])
    }

    // MARK: Header
    func buildHeader() {
        crownView.image = UIImage(systemName: "crown.fill")
        crownView.tintColor = Theme.purple
        crownView.contentMode = .scaleAspectFit
        crownView.translatesAutoresizingMaskIntoConstraints = false
        crownView.widthAnchor.constraint(equalToConstant: 38).isActive = true
        crownView.heightAnchor.constraint(equalToConstant: 30).isActive = true

        titleLabel.text = "Social Genius AI ✦"
        titleLabel.textColor = .white
        titleLabel.font = Theme.font(22, .heavy)

        subtitleLabel.text = "Smarter texts. Better conversations."
        subtitleLabel.textColor = Theme.lilac
        subtitleLabel.font = Theme.font(13, .medium)

        let titleStack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        titleStack.axis = .vertical
        titleStack.spacing = 2

        let symbolConfig = UIImage.SymbolConfiguration(pointSize: 14, weight: .bold)
        closeButton.setImage(UIImage(systemName: "xmark", withConfiguration: symbolConfig), for: .normal)
        closeButton.tintColor = .white
        closeButton.backgroundColor = Theme.cardBg
        closeButton.layer.cornerRadius = 20
        closeButton.layer.borderWidth = 1.2
        closeButton.layer.borderColor = Theme.blue.withAlphaComponent(0.5).cgColor
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.widthAnchor.constraint(equalToConstant: 40).isActive = true
        closeButton.heightAnchor.constraint(equalToConstant: 40).isActive = true
        closeButton.addTarget(self, action: #selector(closeExtension), for: .touchUpInside)

        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)

        let headerRow = UIStackView(arrangedSubviews: [crownView, titleStack, spacer, closeButton])
        headerRow.axis = .horizontal
        headerRow.alignment = .center
        headerRow.spacing = 12
        contentStack.addArrangedSubview(headerRow)
    }

    // MARK: Message card (badge card ke upar thoda overlap karta hai)
    func buildMessageSection() {
        messageSection.translatesAutoresizingMaskIntoConstraints = false

        let card = UIView()
        card.backgroundColor = Theme.cardBg
        card.layer.cornerRadius = 18
        card.layer.borderWidth = 1.2
        card.layer.borderColor = Theme.blue.withAlphaComponent(0.5).cgColor
        card.translatesAutoresizingMaskIntoConstraints = false
        messageSection.addSubview(card)

        selectedTextLabel.textColor = .white
        selectedTextLabel.font = Theme.font(16, .semibold)
        selectedTextLabel.numberOfLines = 0
        selectedTextLabel.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(selectedTextLabel)

        messageBadge.translatesAutoresizingMaskIntoConstraints = false
        messageSection.addSubview(messageBadge)

        NSLayoutConstraint.activate([
            messageBadge.topAnchor.constraint(equalTo: messageSection.topAnchor),
            messageBadge.leadingAnchor.constraint(equalTo: messageSection.leadingAnchor, constant: 10),
            messageBadge.trailingAnchor.constraint(lessThanOrEqualTo: messageSection.trailingAnchor, constant: -10),

            card.topAnchor.constraint(equalTo: messageBadge.centerYAnchor),
            card.leadingAnchor.constraint(equalTo: messageSection.leadingAnchor),
            card.trailingAnchor.constraint(equalTo: messageSection.trailingAnchor),
            card.bottomAnchor.constraint(equalTo: messageSection.bottomAnchor),

            selectedTextLabel.topAnchor.constraint(equalTo: card.topAnchor, constant: 30),
            selectedTextLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 16),
            selectedTextLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -16),
            selectedTextLabel.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -16),
        ])
        contentStack.addArrangedSubview(messageSection)
    }

    // MARK: Perspective selector
    func buildPerspectiveBlock() {
        perspectiveLabel.text = "WHO SENT THIS?"
        perspectiveLabel.textColor = Theme.lilac
        perspectiveLabel.font = Theme.font(12, .heavy)

        perspectiveStack.axis = .horizontal
        perspectiveStack.spacing = 12
        perspectiveStack.distribution = .fillEqually
        styleUnselectedButton(myMessageBtn, title: "Mine")
        myMessageBtn.addTarget(self, action: #selector(selectMine), for: .touchUpInside)
        styleUnselectedButton(theirMessageBtn, title: "Theirs")
        theirMessageBtn.addTarget(self, action: #selector(selectTheirs), for: .touchUpInside)
        perspectiveStack.addArrangedSubview(myMessageBtn)
        perspectiveStack.addArrangedSubview(theirMessageBtn)

        perspectiveBlock.axis = .vertical
        perspectiveBlock.spacing = 10
        perspectiveBlock.addArrangedSubview(perspectiveLabel)
        perspectiveBlock.addArrangedSubview(perspectiveStack)
        contentStack.addArrangedSubview(perspectiveBlock)
    }

    func styleUnselectedButton(_ button: UIButton, title: String) {
        button.setTitle(title, for: .normal)
        button.backgroundColor = Theme.cardBg
        button.setTitleColor(.white, for: .normal)
        button.titleLabel?.font = Theme.font(15, .bold)
        button.layer.cornerRadius = 14
        button.layer.borderWidth = 1.2
        button.layer.borderColor = Theme.blue.withAlphaComponent(0.4).cgColor
        button.heightAnchor.constraint(equalToConstant: 46).isActive = true
    }

    // MARK: Loading
    func buildLoading() {
        loadingProgressView.translatesAutoresizingMaskIntoConstraints = false
        loadingProgressView.isHidden = true
        contentStack.addArrangedSubview(loadingProgressView)
    }

    // MARK: Verdict card (left: mascot + ring + pill | right: what this means)
    func buildVerdictCard() {
        verdictCard.backgroundColor = Theme.purple.withAlphaComponent(0.10)
        verdictCard.layer.cornerRadius = 22
        verdictCard.layer.borderWidth = 1.2
        verdictCard.layer.borderColor = Theme.purple.withAlphaComponent(0.55).cgColor
        verdictCard.isHidden = true

        // ---- Left column ----
        mascotImageView.contentMode = .scaleAspectFit
        mascotImageView.translatesAutoresizingMaskIntoConstraints = false

        mascotEmojiLabel.font = UIFont.systemFont(ofSize: 46)
        mascotEmojiLabel.textAlignment = .center
        mascotEmojiLabel.isHidden = true
        mascotEmojiLabel.translatesAutoresizingMaskIntoConstraints = false

        let mascotBox = UIView()
        mascotBox.translatesAutoresizingMaskIntoConstraints = false
        mascotBox.addSubview(mascotImageView)
        mascotBox.addSubview(mascotEmojiLabel)
        NSLayoutConstraint.activate([
            mascotBox.widthAnchor.constraint(equalToConstant: 80),
            mascotBox.heightAnchor.constraint(equalToConstant: 62),
            mascotImageView.topAnchor.constraint(equalTo: mascotBox.topAnchor),
            mascotImageView.bottomAnchor.constraint(equalTo: mascotBox.bottomAnchor),
            mascotImageView.leadingAnchor.constraint(equalTo: mascotBox.leadingAnchor),
            mascotImageView.trailingAnchor.constraint(equalTo: mascotBox.trailingAnchor),
            mascotEmojiLabel.centerXAnchor.constraint(equalTo: mascotBox.centerXAnchor),
            mascotEmojiLabel.centerYAnchor.constraint(equalTo: mascotBox.centerYAnchor),
        ])

        scoreRing.translatesAutoresizingMaskIntoConstraints = false
        scoreRing.widthAnchor.constraint(equalToConstant: 104).isActive = true
        scoreRing.heightAnchor.constraint(equalToConstant: 104).isActive = true

        verdictPill.translatesAutoresizingMaskIntoConstraints = false

        let leftCol = UIStackView(arrangedSubviews: [mascotBox, scoreRing, verdictPill])
        leftCol.axis = .vertical
        leftCol.alignment = .center
        leftCol.spacing = 6
        leftCol.translatesAutoresizingMaskIntoConstraints = false
        leftCol.widthAnchor.constraint(equalToConstant: 118).isActive = true
        verdictPill.widthAnchor.constraint(equalTo: leftCol.widthAnchor).isActive = true

        // ---- Right column ----
        headingLabel.numberOfLines = 0
        bodyLabel.numberOfLines = 0

        tipBox.backgroundColor = UIColor.white.withAlphaComponent(0.04)
        tipBox.layer.cornerRadius = 14
        tipBox.layer.borderWidth = 1
        tipBox.layer.borderColor = Theme.blue.withAlphaComponent(0.35).cgColor

        let bulb = UIImageView(image: UIImage(systemName: "lightbulb.fill"))
        bulb.tintColor = Theme.yellow
        bulb.contentMode = .scaleAspectFit
        bulb.translatesAutoresizingMaskIntoConstraints = false
        bulb.widthAnchor.constraint(equalToConstant: 18).isActive = true
        bulb.heightAnchor.constraint(equalToConstant: 18).isActive = true

        tipLabel.numberOfLines = 0
        tipLabel.font = Theme.font(12.5, .medium)
        tipLabel.textColor = UIColor(white: 0.88, alpha: 1.0)

        let tipRow = UIStackView(arrangedSubviews: [bulb, tipLabel])
        tipRow.axis = .horizontal
        tipRow.alignment = .top
        tipRow.spacing = 8
        tipRow.translatesAutoresizingMaskIntoConstraints = false
        tipBox.addSubview(tipRow)
        NSLayoutConstraint.activate([
            tipRow.topAnchor.constraint(equalTo: tipBox.topAnchor, constant: 10),
            tipRow.leadingAnchor.constraint(equalTo: tipBox.leadingAnchor, constant: 10),
            tipRow.trailingAnchor.constraint(equalTo: tipBox.trailingAnchor, constant: -10),
            tipRow.bottomAnchor.constraint(equalTo: tipBox.bottomAnchor, constant: -10),
        ])

        let rightCol = UIStackView(arrangedSubviews: [wrapLeading(whatPill), headingLabel, bodyLabel, tipBox])
        rightCol.axis = .vertical
        rightCol.spacing = 8

        // ---- Row ----
        let verdictRow = UIStackView(arrangedSubviews: [leftCol, rightCol])
        verdictRow.axis = .horizontal
        verdictRow.alignment = .top
        verdictRow.spacing = 12
        verdictRow.translatesAutoresizingMaskIntoConstraints = false
        verdictCard.addSubview(verdictRow)
        NSLayoutConstraint.activate([
            verdictRow.topAnchor.constraint(equalTo: verdictCard.topAnchor, constant: 12),
            verdictRow.leadingAnchor.constraint(equalTo: verdictCard.leadingAnchor, constant: 12),
            verdictRow.trailingAnchor.constraint(equalTo: verdictCard.trailingAnchor, constant: -12),
            verdictRow.bottomAnchor.constraint(equalTo: verdictCard.bottomAnchor, constant: -12),
        ])

        contentStack.addArrangedSubview(verdictCard)
    }

    /// Pill ko stack me poori width par failne se rokta hai
    func wrapLeading(_ pill: UIView) -> UIView {
        let wrapper = UIView()
        pill.translatesAutoresizingMaskIntoConstraints = false
        wrapper.addSubview(pill)
        NSLayoutConstraint.activate([
            pill.topAnchor.constraint(equalTo: wrapper.topAnchor),
            pill.bottomAnchor.constraint(equalTo: wrapper.bottomAnchor),
            pill.leadingAnchor.constraint(equalTo: wrapper.leadingAnchor),
            pill.trailingAnchor.constraint(lessThanOrEqualTo: wrapper.trailingAnchor),
        ])
        return wrapper
    }

    // MARK: Reply section
    func buildReplySection() {
        let sparkle = UIImageView(image: UIImage(systemName: "sparkle"))
        sparkle.tintColor = Theme.pink
        sparkle.contentMode = .scaleAspectFit
        sparkle.translatesAutoresizingMaskIntoConstraints = false
        sparkle.widthAnchor.constraint(equalToConstant: 20).isActive = true
        sparkle.heightAnchor.constraint(equalToConstant: 20).isActive = true

        replyHeaderLabel.text = "REPLY VARIATIONS"
        replyHeaderLabel.textColor = Theme.lilac
        replyHeaderLabel.font = Theme.font(14, .heavy)

        seeMoreButton.setTitle("See more →", for: .normal)
        seeMoreButton.setTitleColor(Theme.pink, for: .normal)
        seeMoreButton.titleLabel?.font = Theme.font(13, .bold)
        seeMoreButton.addTarget(self, action: #selector(toggleSeeMore), for: .touchUpInside)
        seeMoreButton.isHidden = true

        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)

        let headerRow = UIStackView(arrangedSubviews: [sparkle, replyHeaderLabel, spacer, seeMoreButton])
        headerRow.axis = .horizontal
        headerRow.alignment = .center
        headerRow.spacing = 8

        replyListStack.axis = .vertical
        replyListStack.spacing = 10

        replySection.axis = .vertical
        replySection.spacing = 12
        replySection.addArrangedSubview(headerRow)
        replySection.addArrangedSubview(replyListStack)
        replySection.isHidden = true
        contentStack.addArrangedSubview(replySection)
    }

    // MARK: Buttons
    func buildButtons() {
        // Regenerate
        regenerateButton.setTitle("↻  Regenerate Replies", for: .normal)
        regenerateButton.setTitleColor(.white, for: .normal)
        regenerateButton.titleLabel?.font = Theme.font(16, .bold)
        regenerateButton.heightAnchor.constraint(equalToConstant: 52).isActive = true
        regenerateButton.addTarget(self, action: #selector(regenerateTapped), for: .touchUpInside)
        regenerateButton.isHidden = true
        contentStack.addArrangedSubview(regenerateButton)

        regenerateSpinner.color = .white
        regenerateSpinner.hidesWhenStopped = true
        regenerateSpinner.translatesAutoresizingMaskIntoConstraints = false
        regenerateButton.addSubview(regenerateSpinner)
        NSLayoutConstraint.activate([
            regenerateSpinner.centerYAnchor.constraint(equalTo: regenerateButton.centerYAnchor),
            regenerateSpinner.trailingAnchor.constraint(equalTo: regenerateButton.trailingAnchor, constant: -20),
        ])

        // Analyze / Retry
        actionButton.setTitle("Select who sent it first", for: .normal)
        actionButton.setTitleColor(.white, for: .normal)
        actionButton.setTitleColor(.white, for: .disabled)
        actionButton.titleLabel?.font = Theme.font(16, .heavy)
        actionButton.layer.shadowColor = Theme.pink.cgColor
        actionButton.layer.shadowOpacity = 0.45
        actionButton.layer.shadowOffset = CGSize(width: 0, height: 4)
        actionButton.layer.shadowRadius = 10
        actionButton.heightAnchor.constraint(equalToConstant: 52).isActive = true
        actionButton.addTarget(self, action: #selector(buttonTapped), for: .touchUpInside)
        actionButton.isEnabled = false
        actionButton.alpha = 0.5
        contentStack.addArrangedSubview(actionButton)
    }

    // MARK: - Perspective Selection
    @objc func selectMine() {
        selectedPerspective = "user"
        messageBadge.label.text = "TEXT YOU WERE ABOUT TO SEND"
        highlightSelection(selected: myMessageBtn, other: theirMessageBtn)
    }

    @objc func selectTheirs() {
        selectedPerspective = "opponent"
        messageBadge.label.text = "THEIR MESSAGE"
        highlightSelection(selected: theirMessageBtn, other: myMessageBtn)
    }

    func highlightSelection(selected: UIButton, other: UIButton) {
        selected.backgroundColor = Theme.pink
        selected.layer.borderColor = Theme.pink.cgColor
        other.backgroundColor = Theme.cardBg
        other.layer.borderColor = Theme.blue.withAlphaComponent(0.4).cgColor
        actionButton.isEnabled = true
        actionButton.alpha = 1.0
        actionButton.setTitle("Analyze This Text", for: .normal)
    }

    // MARK: - Extension Lifecycle
    @objc func closeExtension() {
        self.extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
        func showProRequired() {
        let alert = UIAlertController(
            title: "Pro feature 👑",
            message: "Upgrade to Social Genius Pro in the app to analyze texts from any chat.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            self.closeExtension()
        })
        present(alert, animated: true)
    }

    func extractSharedText() {
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
              let attachments = extensionItem.attachments else { return }

        var collectedTexts: [String] = []
        let group = DispatchGroup()

        for provider in attachments {
            if provider.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.text.identifier, options: nil) { (text, error) in
                    if let sharedText = text as? String {
                        collectedTexts.append(sharedText)
                    }
                    group.leave()
                }
            }
        }

        group.notify(queue: .main) {
            self.extractedText = collectedTexts.joined(separator: "\n")
            self.selectedTextLabel.text = self.extractedText.isEmpty ? "No text found" : "\u{201C}\(self.extractedText)\u{201D}"
        }
    }

    // MARK: - Button Actions
    @objc func buttonTapped() {
        generateReply()
    }

    @objc func toggleSeeMore() {
        isExpanded.toggle()
        rebuildReplyRows()
    }

    func copyReply(at index: Int) {
        guard index < replies.count,
              let message = replies[index]["message"] as? String else { return }
        UIPasteboard.general.string = message
        if index < replyRows.count {
            replyRows[index].showCopied()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            self.closeExtension()
        }
    }

    // MARK: - Networking
    func buildRequest(regenerate: Bool) -> URLRequest {
        let url = URL(string: "https://chat-genious.onrender.com/api/analyze-chat")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("true", forHTTPHeaderField: "Bypass-Tunnel-Reminder")
        request.timeoutInterval = 25

        var body: [String: Any] = [
            "userMessage": extractedText,
            "perspective": selectedPerspective
        ]
        if regenerate {
            body["regenerate"] = true
            body["previousReplies"] = replies.compactMap { $0["message"] as? String }
        }
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        return request
    }

    func parseResponse(data: Data?, error: Error?) -> [String: Any]? {
        guard let data = data, error == nil,
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let success = json["success"] as? Bool, success == true,
              let dataObj = json["data"] as? [String: Any] else { return nil }
        return dataObj
    }

        func generateReply() {
        guard ProGate.isPro else { showProRequired(); return }
        guard !extractedText.isEmpty, !selectedPerspective.isEmpty else { return }

        perspectiveBlock.isHidden = true
        actionButton.isHidden = true

        loadingProgressView.isHidden = false
        loadingProgressView.startAnimating()

        let request = buildRequest(regenerate: false)
        URLSession.shared.dataTask(with: request) { data, _, error in
            DispatchQueue.main.async {
                guard let dataObj = self.parseResponse(data: data, error: error) else {
                    self.loadingProgressView.isHidden = true
                    self.actionButton.isHidden = false
                    self.actionButton.setTitle("Something went wrong — Tap to Retry", for: .normal)
                    return
                }
                self.loadingProgressView.completeAndStop {
                    self.loadingProgressView.isHidden = true
                    self.renderResult(dataObj)
                }
            }
        }.resume()
    }

     @objc func regenerateTapped() {
        guard ProGate.isPro else { showProRequired(); return }
        guard !isRegenerating, hasGenerated else { return }
        isRegenerating = true

        regenerateButton.isEnabled = false
        regenerateButton.setTitle("Regenerating...", for: .normal)
        regenerateSpinner.startAnimating()
        UIView.animate(withDuration: 0.2) {
            self.replyListStack.alpha = 0.3
        }

        let request = buildRequest(regenerate: true)
        URLSession.shared.dataTask(with: request) { data, _, error in
            DispatchQueue.main.async {
                self.isRegenerating = false
                self.regenerateSpinner.stopAnimating()
                self.regenerateButton.isEnabled = true
                UIView.animate(withDuration: 0.25) {
                    self.replyListStack.alpha = 1.0
                }

                guard let dataObj = self.parseResponse(data: data, error: error) else {
                    self.regenerateButton.setTitle("Failed — Tap to Retry", for: .normal)
                    return
                }
                self.regenerateButton.setTitle("↻  Regenerate Replies", for: .normal)

                // Sirf replies update hon, score/description same rahein
                self.updateRepliesOnly(dataObj)
            }
        }.resume()
    }

    func updateRepliesOnly(_ dataObj: [String: Any]) {
        replies = (dataObj["replies"] as? [[String: Any]]) ?? []
        isExpanded = false
        rebuildReplyRows()
    }

    // MARK: - Render Result
    func renderResult(_ dataObj: [String: Any]) {
        let isOpponent = selectedPerspective == "opponent"

        // ---- Score + label ----
        let verdictObj = dataObj["verdict"] as? [String: Any]
        let verdictParagraph = (dataObj["verdict_paragraph"] as? String) ?? ""
        var score = 5
        var label = (verdictObj?["main"] as? String) ?? "Mixed"

        if let regex = try? NSRegularExpression(pattern: "Verdict:\\s*([^,]+),\\s*(\\d+)\\s*/\\s*10", options: .caseInsensitive) {
            let range = NSRange(verdictParagraph.startIndex..., in: verdictParagraph)
            if let match = regex.firstMatch(in: verdictParagraph, options: [], range: range) {
                if let labelRange = Range(match.range(at: 1), in: verdictParagraph) {
                    label = String(verdictParagraph[labelRange]).trimmingCharacters(in: .whitespaces)
                }
                if let scoreRange = Range(match.range(at: 2), in: verdictParagraph) {
                    score = Int(verdictParagraph[scoreRange]) ?? 5
                }
            }
        }
        if let tag = (verdictObj?["vibe_tag"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
   !tag.isEmpty {
    label = tag
}

        // ---- Left column ----
        configureMascot(score: score)
        scoreRing.configure(score: score)
        verdictPill.configure(
            prefix: isOpponent ? "THEIR VIBE" : "YOUR VERDICT",
            label: label.uppercased(),
            color: ScoreRingView.color(for: score)
        )

        // ---- Right column ----
        let description = (verdictObj?["description"] as? String)
            ?? (dataObj["analysis_reason"] as? String)
            ?? "Analysis complete."

        // Backend ye fields bhej de to wahi use hongi, warna description se nikal li jati hain
        let customHeadline = (verdictObj?["headline"] as? String) ?? (dataObj["headline"] as? String)
        let customTip = (verdictObj?["tip"] as? String) ?? (dataObj["tip"] as? String)
        let split = splitDescription(description)
        let tipText = customTip ?? split.tip

        headingLabel.attributedText = makeHeading(label: label, isOpponent: isOpponent, custom: customHeadline)

        let paragraph = NSMutableParagraphStyle()
        paragraph.lineSpacing = 3
        bodyLabel.attributedText = NSAttributedString(
            string: split.body,
            attributes: [
                .font: Theme.font(13, .regular),
                .foregroundColor: UIColor(white: 0.9, alpha: 1.0),
                .paragraphStyle: paragraph,
            ]
        )

        if let tipText = tipText, !tipText.isEmpty {
            tipLabel.text = tipText
            tipBox.isHidden = false
        } else {
            tipBox.isHidden = true
        }

        verdictCard.isHidden = false

        // ---- Replies ----
        replies = (dataObj["replies"] as? [[String: Any]]) ?? []
        isExpanded = false
        rebuildReplyRows()
        replySection.isHidden = false

        hasGenerated = true
        regenerateButton.isHidden = false
    }

    func configureMascot(score: Int) {
        let name = score <= 3 ? "mascot_sad" : (score <= 6 ? "mascot_neutral" : "mascot_happy")
        // Mascot image extension ke bundle me honi chahiye. Na mile to emoji fallback.
        if let image = UIImage(named: name, in: Bundle(for: ActionViewController.self), compatibleWith: nil) {
            mascotImageView.image = image
            mascotImageView.isHidden = false
            mascotEmojiLabel.isHidden = true
        } else {
            mascotImageView.isHidden = true
            mascotEmojiLabel.text = score <= 3 ? "😰" : (score <= 6 ? "😐" : "😎")
            mascotEmojiLabel.isHidden = false
        }
    }

    func makeHeading(label: String, isOpponent: Bool, custom: String?) -> NSAttributedString {
        let font = Theme.font(19, .heavy)
        if let custom = custom, !custom.isEmpty {
            return NSAttributedString(string: custom, attributes: [.font: font, .foregroundColor: UIColor.white])
        }
        let lead = isOpponent ? "Their message reads as " : "This message reads as "
        let result = NSMutableAttributedString(
            string: lead,
            attributes: [.font: font, .foregroundColor: UIColor.white]
        )
        result.append(NSAttributedString(
            string: label.lowercased() + ".",
            attributes: [.font: font, .foregroundColor: Theme.pink]
        ))
        return result
    }

    /// Description ko (body, tip) me todta hai. Last paragraph / last 1-2 sentences "tip" ban jate hain.
    func splitDescription(_ text: String) -> (body: String, tip: String?) {
        let paragraphs = text
            .components(separatedBy: "\n\n")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        if paragraphs.count >= 2 {
            return (paragraphs.dropLast().joined(separator: "\n\n"), paragraphs.last)
        }

        var sentences: [String] = []
        text.enumerateSubstrings(in: text.startIndex..<text.endIndex, options: .bySentences) { substring, _, _, _ in
            if let s = substring?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty {
                sentences.append(s)
            }
        }
        if sentences.count >= 4 {
            return (sentences.dropLast(2).joined(separator: " "), sentences.suffix(2).joined(separator: " "))
        }
        if sentences.count == 3 {
            return (sentences.dropLast(1).joined(separator: " "), sentences.last)
        }
        return (text, nil)
    }

    // MARK: - Reply rows
    func rebuildReplyRows() {
        replyListStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        replyRows.removeAll()

        let limit = isExpanded ? replies.count : min(replies.count, collapsedCount)
        for (index, reply) in replies.prefix(limit).enumerated() {
            let tone = (reply["tone"] as? String) ?? "Reply"
            let message = (reply["message"] as? String) ?? ""
            let row = ReplyRow(tone: tone, message: message, color: toneColor(tone), icon: toneIcon(tone))
            row.onTap = { [weak self] in self?.copyReply(at: index) }
            replyListStack.addArrangedSubview(row)
            replyRows.append(row)
        }

        seeMoreButton.isHidden = replies.count <= collapsedCount
        seeMoreButton.setTitle(isExpanded ? "See less ↑" : "See more →", for: .normal)
    }

    // MARK: - Tone styling
    func toneColor(_ tone: String) -> UIColor {
        switch tone.lowercased() {
        case "calm": return UIColor(red: 34/255, green: 211/255, blue: 238/255, alpha: 1.0)
        case "high-value": return Theme.purple
        case "charismatic": return Theme.yellow
        case "playful": return UIColor(red: 45/255, green: 212/255, blue: 191/255, alpha: 1.0)
        case "respected": return UIColor(red: 59/255, green: 130/255, blue: 246/255, alpha: 1.0)
        default: return Theme.purple
        }
    }

    func toneIcon(_ tone: String) -> String {
        switch tone.lowercased() {
        case "calm": return "snowflake"
        case "high-value": return "crown.fill"
        case "charismatic": return "heart.fill"
        case "playful": return "face.smiling.fill"
        case "respected": return "hands.clap.fill"
        default: return "sparkles"
        }
    }
}

// MARK: - Gradient helpers
final class GradientView: UIView {
    override class var layerClass: AnyClass { CAGradientLayer.self }
    var gradientLayer: CAGradientLayer { layer as! CAGradientLayer }
}

final class GradientButton: UIButton {
    override class var layerClass: AnyClass { CAGradientLayer.self }
    private var gradientLayer: CAGradientLayer { layer as! CAGradientLayer }

    init(colors: [UIColor]) {
        super.init(frame: .zero)
        gradientLayer.colors = colors.map { $0.cgColor }
        gradientLayer.startPoint = CGPoint(x: 0, y: 0.5)
        gradientLayer.endPoint = CGPoint(x: 1, y: 0.5)
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        layer.cornerRadius = bounds.height / 2
    }
}

// MARK: - Pill badge (icon + text)
final class PillView: UIView {
    let label = UILabel()

    init(text: String, icon: String?, color: UIColor) {
        super.init(frame: .zero)
        backgroundColor = color.withAlphaComponent(0.16)

        let row = UIStackView()
        row.axis = .horizontal
        row.spacing = 6
        row.alignment = .center
        row.translatesAutoresizingMaskIntoConstraints = false
        addSubview(row)

        if let icon = icon {
            let iconView = UIImageView(image: UIImage(systemName: icon))
            iconView.tintColor = color
            iconView.contentMode = .scaleAspectFit
            iconView.translatesAutoresizingMaskIntoConstraints = false
            iconView.widthAnchor.constraint(equalToConstant: 15).isActive = true
            iconView.heightAnchor.constraint(equalToConstant: 15).isActive = true
            row.addArrangedSubview(iconView)
        }

        label.text = text
        label.textColor = color
        label.font = Theme.font(12, .heavy)
        row.addArrangedSubview(label)

        NSLayoutConstraint.activate([
            row.topAnchor.constraint(equalTo: topAnchor, constant: 6),
            row.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -6),
            row.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 12),
            row.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -12),
        ])
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        super.layoutSubviews()
        layer.cornerRadius = bounds.height / 2
    }
}

// MARK: - "YOUR VERDICT / DOWN BAD" pill
final class VerdictPillView: UIView {
    private let topLabel = UILabel()
    private let mainLabel = UILabel()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setup()
    }
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        layer.cornerRadius = 16
        layer.borderWidth = 1.2

        topLabel.font = Theme.font(11, .semibold)
        topLabel.textColor = UIColor(white: 0.92, alpha: 1.0)
        topLabel.textAlignment = .center

        mainLabel.font = Theme.font(17, .heavy)
        mainLabel.textAlignment = .center
        mainLabel.adjustsFontSizeToFitWidth = true
        mainLabel.minimumScaleFactor = 0.6
        mainLabel.numberOfLines = 1

        let stack = UIStackView(arrangedSubviews: [topLabel, mainLabel])
        stack.axis = .vertical
        stack.spacing = 1
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: topAnchor, constant: 7),
            stack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -7),
            stack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -8),
        ])
    }

    func configure(prefix: String, label: String, color: UIColor) {
        topLabel.text = prefix
        mainLabel.text = label
        mainLabel.textColor = color
        backgroundColor = color.withAlphaComponent(0.10)
        layer.borderColor = color.withAlphaComponent(0.45).cgColor
    }
}

// MARK: - Animated Loading Progress View
class LoadingProgressView: UIView {

    private let purpleAccent = UIColor(red: 168/255, green: 85/255, blue: 247/255, alpha: 1.0)
    private let pinkAccent = UIColor(red: 217/255, green: 70/255, blue: 239/255, alpha: 1.0)

    private let stackView = UIStackView()
    private let statusLabel = UILabel()
    private let taskStack = UIStackView()
    private let progressBarBg = UIView()
    private let progressBarFill = UIView()
    private var progressWidthConstraint: NSLayoutConstraint!
    private let percentLabel = UILabel()
    private let footerLabel = UILabel()

    private let tasks: [(icon: String, title: String)] = [
        ("magnifyingglass", "analyzing emotional energy..."),
        ("eye", "scanning conversation..."),
        ("scale.3d", "checking power dynamics..."),
        ("shield", "detecting desperation levels..."),
        ("waveform.path.ecg", "calculating aura risk...")
    ]
    private var taskRows: [UIStackView] = []
    private var taskTimer: Timer?
    private var currentTaskIndex = 0

    // 🔴 NAYA — continuous crawl ke liye
    private var crawlTimer: Timer?
    private var crawlProgress: CGFloat = 0
    private let crawlCap: CGFloat = 97   // yahan tak hi jayega, 100% sirf completeAndStop() par

    override init(frame: CGRect) {
        super.init(frame: frame)
        setup()
    }
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        stackView.axis = .vertical
        stackView.spacing = 16
        stackView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stackView)

        statusLabel.text = "Reading between the lines..."
        statusLabel.textColor = .white
        statusLabel.font = UIFont.systemFont(ofSize: 16, weight: .bold)
        statusLabel.textAlignment = .center
        stackView.addArrangedSubview(statusLabel)

        taskStack.axis = .vertical
        taskStack.spacing = 10
        for task in tasks {
            let row = makeTaskRow(icon: task.icon, title: task.title)
            taskStack.addArrangedSubview(row)
            taskRows.append(row)
        }
        stackView.addArrangedSubview(taskStack)

        percentLabel.text = "0%"
        percentLabel.textColor = purpleAccent
        percentLabel.font = UIFont.systemFont(ofSize: 20, weight: .bold)
        percentLabel.textAlignment = .center
        stackView.addArrangedSubview(percentLabel)

        progressBarBg.backgroundColor = UIColor.white.withAlphaComponent(0.06)
        progressBarBg.layer.cornerRadius = 3
        progressBarBg.translatesAutoresizingMaskIntoConstraints = false
        progressBarBg.heightAnchor.constraint(equalToConstant: 6).isActive = true
        stackView.addArrangedSubview(progressBarBg)

        progressBarFill.backgroundColor = pinkAccent
        progressBarFill.layer.cornerRadius = 3
        progressBarFill.translatesAutoresizingMaskIntoConstraints = false
        progressBarBg.addSubview(progressBarFill)

        progressWidthConstraint = progressBarFill.widthAnchor.constraint(equalToConstant: 0)
        NSLayoutConstraint.activate([
            progressBarFill.leadingAnchor.constraint(equalTo: progressBarBg.leadingAnchor),
            progressBarFill.topAnchor.constraint(equalTo: progressBarBg.topAnchor),
            progressBarFill.bottomAnchor.constraint(equalTo: progressBarBg.bottomAnchor),
            progressWidthConstraint
        ])

        footerLabel.text = "genius is connecting the dots 🧠"
        footerLabel.textColor = .lightGray
        footerLabel.font = UIFont.systemFont(ofSize: 12)
        footerLabel.textAlignment = .center
        stackView.addArrangedSubview(footerLabel)

        NSLayoutConstraint.activate([
            stackView.topAnchor.constraint(equalTo: topAnchor),
            stackView.leadingAnchor.constraint(equalTo: leadingAnchor),
            stackView.trailingAnchor.constraint(equalTo: trailingAnchor),
            stackView.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    private func makeTaskRow(icon: String, title: String) -> UIStackView {
        let row = UIStackView()
        row.axis = .horizontal
        row.spacing = 10
        row.alignment = .center
        row.alpha = 0.3

        let iconBox = UIView()
        iconBox.backgroundColor = purpleAccent.withAlphaComponent(0.1)
        iconBox.layer.cornerRadius = 13
        iconBox.translatesAutoresizingMaskIntoConstraints = false
        iconBox.widthAnchor.constraint(equalToConstant: 26).isActive = true
        iconBox.heightAnchor.constraint(equalToConstant: 26).isActive = true

        let iconView = UIImageView(image: UIImage(systemName: icon))
        iconView.tintColor = purpleAccent
        iconView.contentMode = .scaleAspectFit
        iconView.translatesAutoresizingMaskIntoConstraints = false
        iconBox.addSubview(iconView)
        NSLayoutConstraint.activate([
            iconView.centerXAnchor.constraint(equalTo: iconBox.centerXAnchor),
            iconView.centerYAnchor.constraint(equalTo: iconBox.centerYAnchor),
            iconView.widthAnchor.constraint(equalToConstant: 13),
            iconView.heightAnchor.constraint(equalToConstant: 13),
        ])

        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.textColor = UIColor(white: 0.85, alpha: 1.0)
        titleLabel.font = UIFont.systemFont(ofSize: 12, weight: .medium)

        let checkIcon = UIImageView(image: UIImage(systemName: "circle"))
        checkIcon.tintColor = .lightGray
        checkIcon.translatesAutoresizingMaskIntoConstraints = false
        checkIcon.widthAnchor.constraint(equalToConstant: 16).isActive = true
        checkIcon.heightAnchor.constraint(equalToConstant: 16).isActive = true

        row.addArrangedSubview(iconBox)
        row.addArrangedSubview(titleLabel)
        row.addArrangedSubview(UIView())
        row.addArrangedSubview(checkIcon)

        return row
    }

    func startAnimating() {
    currentTaskIndex = 0
    taskRows.forEach { $0.alpha = 0.3 }
    crawlProgress = 0
    updateProgress(to: 0, animated: false)

    taskTimer?.invalidate()
    taskTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] timer in
        guard let self = self else { return }
        if self.currentTaskIndex >= self.taskRows.count {
            timer.invalidate()
            return
        }
        let row = self.taskRows[self.currentTaskIndex]
        UIView.animate(withDuration: 0.3) {
            row.alpha = 1.0
        }
        if let checkIcon = row.arrangedSubviews.last as? UIImageView {
            checkIcon.image = UIImage(systemName: "checkmark.circle.fill")
            checkIcon.tintColor = self.purpleAccent
        }
        self.currentTaskIndex += 1
    }

    // 🔴 NAYA — 0 se 97% tak kabhi na rukne wali crawl.
    // Har 0.1 second thora aage barhta hai, response chahe kitni bhi der le.
    crawlTimer?.invalidate()
    crawlTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] timer in
        guard let self = self else { timer.invalidate(); return }
        let remaining = self.crawlCap - self.crawlProgress
        if remaining <= 0.05 {
            self.crawlProgress = self.crawlCap
        } else {
            // Jitna paas pahunchte hain, utni dheemi raftar — lekin chhota floor step
            // hamesha maujood hai taake bar kabhi bilkul freeze na ho.
            let step = max(remaining * 0.01, 0.015)
            self.crawlProgress = min(self.crawlProgress + step, self.crawlCap)
        }
        self.updateProgress(to: self.crawlProgress, animated: false)
    }
}
    func completeAndStop(completion: (() -> Void)? = nil) {
        taskTimer?.invalidate()
        crawlTimer?.invalidate()
        taskRows.forEach { row in
            row.alpha = 1.0
            if let checkIcon = row.arrangedSubviews.last as? UIImageView {
                checkIcon.image = UIImage(systemName: "checkmark.circle.fill")
                checkIcon.tintColor = purpleAccent
            }
        }
        updateProgress(to: 100, animated: true, duration: 0.5) {
            completion?()
        }
    }

    private func updateProgress(to percent: CGFloat, animated: Bool, duration: TimeInterval = 0.3, completion: (() -> Void)? = nil) {
        layoutIfNeeded()
        let fullWidth = progressBarBg.bounds.width
        let targetWidth = fullWidth * (percent / 100)

        progressWidthConstraint.constant = targetWidth
        percentLabel.text = "\(Int(percent))%"

        if animated {
            UIView.animate(withDuration: duration, delay: 0, options: .curveEaseOut, animations: {
                self.layoutIfNeeded()
            }, completion: { _ in completion?() })
        } else {
            layoutIfNeeded()
            completion?()
        }
    }

    deinit {
        taskTimer?.invalidate()
         crawlTimer?.invalidate()
    }
}

// MARK: - Circular Score Ring ("3/10" ring ke andar)
final class ScoreRingView: UIView {
    private let trackLayer = CAShapeLayer()
    private let progressLayer = CAShapeLayer()
    private let scoreLabel = UILabel()
    private let lineW: CGFloat = 8

    override init(frame: CGRect) {
        super.init(frame: frame)
        setup()
    }
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        for shape in [trackLayer, progressLayer] {
            shape.fillColor = UIColor.clear.cgColor
            shape.lineWidth = lineW
            shape.lineCap = .round
            layer.addSublayer(shape)
        }
        trackLayer.strokeColor = UIColor.white.withAlphaComponent(0.10).cgColor
        progressLayer.strokeEnd = 0

        scoreLabel.textAlignment = .center
        scoreLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(scoreLabel)
        NSLayoutConstraint.activate([
            scoreLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            scoreLabel.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let center = CGPoint(x: bounds.midX, y: bounds.midY)
        let radius = min(bounds.width, bounds.height) / 2 - lineW / 2 - 2
        let path = UIBezierPath(arcCenter: center, radius: radius, startAngle: -.pi / 2, endAngle: 1.5 * .pi, clockwise: true)
        trackLayer.path = path.cgPath
        progressLayer.path = path.cgPath
    }

    /// Score ke hisaab se color: 0-3 red, 4-6 yellow, 7-10 green
    static func color(for score: Int) -> UIColor {
        switch score {
        case 0...3:
            return UIColor(red: 244/255, green: 63/255, blue: 94/255, alpha: 1.0)
        case 4...6:
            return UIColor(red: 251/255, green: 191/255, blue: 36/255, alpha: 1.0)
        default:
            return UIColor(red: 74/255, green: 222/255, blue: 128/255, alpha: 1.0)
        }
    }

    func configure(score: Int) {
        let color = ScoreRingView.color(for: score)

        let text = NSMutableAttributedString(
            string: "\(score)",
            attributes: [.font: Theme.font(32, .black), .foregroundColor: color]
        )
        text.append(NSAttributedString(
            string: "/10",
            attributes: [.font: Theme.font(20, .heavy), .foregroundColor: UIColor.white]
        ))
        scoreLabel.attributedText = text

        let target = CGFloat(min(max(score, 0), 10)) / 10.0
        progressLayer.strokeColor = color.cgColor
        progressLayer.strokeEnd = target

        let animation = CABasicAnimation(keyPath: "strokeEnd")
        animation.fromValue = 0
        animation.toValue = target
        animation.duration = 0.9
        animation.timingFunction = CAMediaTimingFunction(name: .easeOut)
        progressLayer.add(animation, forKey: "progress")
    }
}

// MARK: - Reply card (icon | tone + message | copy icon)
final class ReplyRow: UIView {
    var onTap: (() -> Void)?
    private let cardView = UIView()
    private let copyIcon = UIImageView()
    private let color: UIColor

    init(tone: String, message: String, color: UIColor, icon: String) {
        self.color = color
        super.init(frame: .zero)
        setup(tone: tone, message: message, icon: icon)
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func setup(tone: String, message: String, icon: String) {
        translatesAutoresizingMaskIntoConstraints = false

        cardView.backgroundColor = color.withAlphaComponent(0.08)
        cardView.layer.cornerRadius = 16
        cardView.layer.borderWidth = 1.6
        cardView.layer.borderColor = color.withAlphaComponent(0.9).cgColor
        cardView.translatesAutoresizingMaskIntoConstraints = false
        cardView.isUserInteractionEnabled = false
        addSubview(cardView)

        let symbolConfig = UIImage.SymbolConfiguration(pointSize: 24, weight: .bold)
        let iconView = UIImageView(image: UIImage(systemName: icon, withConfiguration: symbolConfig))
        iconView.tintColor = color
        iconView.contentMode = .scaleAspectFit
        iconView.translatesAutoresizingMaskIntoConstraints = false
        iconView.widthAnchor.constraint(equalToConstant: 34).isActive = true

        let toneLabel = UILabel()
        toneLabel.text = tone.uppercased()
        toneLabel.textColor = color
        toneLabel.font = Theme.font(14, .heavy)

        let messageLabel = UILabel()
        messageLabel.text = "\u{201C}\(message)\u{201D}"
        messageLabel.textColor = .white
        messageLabel.font = Theme.font(13.5, .medium)
        messageLabel.numberOfLines = 0

        let textStack = UIStackView(arrangedSubviews: [toneLabel, messageLabel])
        textStack.axis = .vertical
        textStack.spacing = 3

        let row = UIStackView(arrangedSubviews: [iconView, textStack])
        row.axis = .horizontal
        row.alignment = .center
        row.spacing = 12
        row.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(row)

        copyIcon.image = UIImage(systemName: "doc.on.doc")
        copyIcon.tintColor = .white
        copyIcon.contentMode = .scaleAspectFit
        copyIcon.translatesAutoresizingMaskIntoConstraints = false
        cardView.addSubview(copyIcon)

        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: topAnchor),
            cardView.leadingAnchor.constraint(equalTo: leadingAnchor),
            cardView.trailingAnchor.constraint(equalTo: trailingAnchor),
            cardView.bottomAnchor.constraint(equalTo: bottomAnchor),

            copyIcon.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            copyIcon.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -12),
            copyIcon.widthAnchor.constraint(equalToConstant: 22),
            copyIcon.heightAnchor.constraint(equalToConstant: 22),

            row.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 12),
            row.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 14),
            row.trailingAnchor.constraint(equalTo: copyIcon.leadingAnchor, constant: -10),
            row.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -12),
        ])

        addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(tapped)))
    }

    @objc private func tapped() { onTap?() }

    func showCopied() {
        copyIcon.image = UIImage(systemName: "checkmark.circle.fill")
        copyIcon.tintColor = color
        cardView.backgroundColor = color.withAlphaComponent(0.18)
    }
}