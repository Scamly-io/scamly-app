import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SECTIONS = [
  {
    title: "1. About the Application",
    body: `(a) Welcome to Scamly (Application). The Application is AI-powered fraud detection and scam prevention services that analyse digital communications in real-time to help individuals identify and avoid online scams, phishing attempts, and fraudulent activities (Services).

(b) The Application is operated by SCAMLY PTY LTD (ACN 695941532). Access to and use of the Application, or any of its associated Products or Services, is provided by SCAMLY PTY LTD. Please read these terms and conditions (Terms) carefully. By using, browsing and/or reading the Application, this signifies that you have read, understood and agree to be bound by the Terms. If you do not agree with the Terms, you must cease usage of the Application, or any of Services, immediately.

(c) SCAMLY PTY LTD reserves the right to review and change any of the Terms by updating this page at its sole discretion. When SCAMLY PTY LTD updates the Terms, it will use reasonable endeavours to provide you with notice of updates to the Terms. Any changes to the Terms take immediate effect from the date of their publication. Before you continue, we recommend you keep a copy of the Terms for your records.`,
  },
  {
    title: "2. Acceptance of the Terms",
    body: `(a) You accept the Terms by remaining on the Application. You may also accept the Terms by clicking to accept or agree to the Terms where this option is made available to you by SCAMLY PTY LTD in the user interface.`,
  },
  {
    title: "3. Registration to use the Services",
    body: `(a) In order to access the Services, you must first register for an account through the Application (Account).

(b) As part of the registration process, or as part of your continued use of the Services, you may be required to provide personal information about yourself (such as identification or contact details), including:

- (i) Email address
- (ii) Preferred username
- (iii) Password
- (iv) Country of residence

(c) You warrant that any information you give to SCAMLY PTY LTD in the course of completing the registration process will always be accurate, correct and up to date.

(d) Once you have completed the registration process, you will be a registered member of the Application (Member) and agree to be bound by the Terms.

(e) You may not use the Services and may not accept the Terms if:

- (i) you are not of legal age to form a binding contract with SCAMLY PTY LTD; or
- (ii) you are a person barred from receiving the Services under the laws of Australia or other countries including the country in which you are resident or from which you use the Services.`,
  },
  {
    title: "4. Your obligations as a Member",
    body: `(a) As a Member, you agree to comply with the following:

- (i) you will use the Services only for purposes that are permitted by:
  (a) the Terms; and
  (b) any applicable law, regulation or generally accepted practices or guidelines in the relevant jurisdictions;

- (ii) you have the sole responsibility for protecting the confidentiality of your password and/or email address. Use of your password by any other person may result in the immediate cancellation of the Services;

- (iii) any use of your registration information by any other person, or third parties, is strictly prohibited. You agree to immediately notify SCAMLY PTY LTD of any unauthorised use of your password or email address or any breach of security of which you have become aware;

- (iv) access and use of the Application is limited, non-transferable and allows for the sole use of the Application by you for the purposes of SCAMLY PTY LTD providing the Services;

- (v) you will not use the Services or the Application in connection with any commercial endeavours except those that are specifically endorsed or approved by the management of SCAMLY PTY LTD;

- (vi) you will not use the Services or Application for any illegal and/or unauthorised use which includes collecting email addresses of Members by electronic or other means for the purpose of sending unsolicited email or unauthorised framing of or linking to the Application;

- (vii) you agree that commercial advertisements, affiliate links, and other forms of solicitation may be removed from the Application without notice and may result in termination of the Services; and

- (viii) you acknowledge and agree that any automated use of the Application or its Services is prohibited.`,
  },
  {
    title: "5. Payment",
    body: `(a) All payments made in the course of your use of the Services are managed through RevenueCat and processed via Apple App Store or Google Play Store In-App Purchase (IAP) systems, depending on your device platform. In using the Application, the Services or when making any payment in relation to your use of the Services, you warrant that you have read, understood and agree to be bound by the RevenueCat terms and conditions, as well as the applicable Apple Media Services Terms and Conditions or Google Play Terms of Service, each of which are available on their respective websites.

(b) You acknowledge and agree that where a request for the payment of the Services Fee is returned or denied, for whatever reason, by your financial institution or is unpaid by you for any other reason, then you are liable for any costs, including banking fees and charges, associated with the Services Fee.

(c) You agree and acknowledge that SCAMLY PTY LTD can vary the Services Fee at any time.

(d) Subscriptions to the Services will automatically renew at the end of each billing period unless cancelled at least 24 hours before the end of the current billing period. Your nominated payment method will be charged for renewal within 24 hours prior to the end of the current billing period at the then-current subscription rate. You may manage or cancel your subscription at any time through your Apple App Store or Google Play Store account settings. No refund or credit will be provided for any unused portion of a billing period upon cancellation, except as required under the Australian Consumer Law or the applicable platform's refund policy.`,
  },
  {
    title: "6. Refund Policy",
    body: `(a) SCAMLY PTY LTD will only provide you with a refund of the Services Fee in the event they are unable to continue to provide the Services or if the manager of SCAMLY PTY LTD makes a decision, at its absolute discretion, that it is reasonable to do so under the circumstances (Refund).

(b) Any benefits set out in this Terms and Conditions may apply in addition to consumer's rights under the Australian Consumer Law.`,
  },
  {
    title: "7. Copyright and Intellectual Property",
    body: `(a) The Application, the Services and all of the related products of SCAMLY PTY LTD are subject to copyright. The material on the Application is protected by copyright under the laws of Australia and through international treaties.

(b) All trademarks, service marks and trade names are owned, registered and/or licensed by SCAMLY PTY LTD, who grants to you a worldwide, non-exclusive, royalty-free, revocable license whilst you are a Member to:

- (i) use the Application pursuant to the Terms;
- (ii) copy and store the Application and the material contained in the Application in your device's cache memory; and
- (iii) print pages from the Application for your own personal and non-commercial use.

SCAMLY PTY LTD does not grant you any other rights whatsoever in relation to the Application or the Services. All other rights are expressly reserved by SCAMLY PTY LTD.

(c) SCAMLY PTY LTD retains all rights, title, and interest in and to the Application and all related Services. Nothing you do on or in relation to the Application will transfer any:

- (i) business name, trading name, domain name, trade mark, industrial design, patent, registered design or copyright, or
- (ii) a right ot use or exploit a business name, trading name, domain name, trademark or industrial design, or
- (iii) a thing, system or process that is the subject of a patent, registered design or copyright (or an adaptation or modification of such a thing, system or process),

to you.

(d) You may not, without the prior written permission of SCAMLY PTY LTD and the permission of any other relevant rights owners: broadcast, republish, up-load to a third party, transmit, post, distribute, show or play in public, adapt or change in any way the Services or third party Services for any purpose, unless otherwise provided by these Terms.

(e) User-Generated Data and Service Improvements
By submitting any content, communications, or data to the Application for analysis (including emails, messages, URLs, or other materials), you grant a perpetual, worldwide, royalty-free, non-exclusive license to use, reproduce, and analyse such submissions in anonymised and aggregated form to improve fraud detection algorithms, train machine learning models, and enhance the Services. All fraud detection patterns, analysis results, and derivative works generated by the Application remain the exclusive property of SCAMLY PTY LTD, and you acknowledge that SCAMLY PTY LTD may use such insights to improve the services without further compensation to you.`,
  },
  {
    title: "8. Privacy",
    body: `(a) SCAMLY PTY LTD takes your privacy seriously and any information provided through your use of the Application and/or Services are subject to SCAMLY PTY LTD's Privacy Policy, which is available on the Application and at scamly.io/privacy.`,
  },
  {
    title: "9. General Disclaimer",
    body: `(a) Nothing in the Terms limits or excludes any guarantees, warranties, representations or conditions implied or imposed by law, including the Australian Consumer Law (or any liability under them) which by law may not be limited or excluded.

(b) Subject to this clause, and to the extent permitted by law:

- (i) all terms, guarantees, warranties, representations or conditions which are not expressly stated in the Terms are excluded; and

- (ii) SCAMLY PTY LTD will not be liable for any special, indirect or consequential loss or damage, loss of profit or opportunity, or damage to goodwill arising out of or in connection with the Services or these Terms, whether at common law, under contract, tort (including negligence), in equity, pursuant to statute or otherwise.

(c) Use of the Application and the Services is at your own risk. Everything on the Application and the Services is provided to you "as is" and "as available" without warranty or condition of any kind. None of the affiliates, directors, officers, employees, agents, contributors and licensors of SCAMLY PTY LTD make any express or implied representation or warranty about the Services (including the products or Services of SCAMLY PTY LTD) referred to on the Application. This includes (but is not limited to) loss or damage you may suffer as a result of any of the following:

- (i) failure of performance, error, omission, interruption, deletion, defect, failure to correct defects, delay in operation or transmission, computer virus or other harmful component, loss of data, communication line failure, unlawful third party conduct, or theft, destruction, alteration or unauthorised access to records;
- (ii) the accuracy, suitability or currency of any information on the Application, the Services, or any of its Services related products (including third party materials and advertisements on the Application);
- (iii) consts incurred as a result of you using the Application, the Services or any of the products of SCAMLY PTY LTD;
- (iv) the Services or operation in respect to links which are provided for your convenience.`,
  },
  {
    title: "10. Limitation of liability",
    body: `(a) SCAMLY PTY LTD's total liability arising out of or in connection with the Services or these Terms, however arising, including under contract, tort (including negligence), in equity, under statute or otherwise, will not exceed the resupply of the Services to you.

(b) You expressly understand and agree that SCAMLY PTY LTD, its affiliates, employees, agents, contributors and licensors shall not be liable to you for any direct, indirect, incidental, special consequential or exemplary damages which may be incurred by you, however caused and under any theory of liability. This shall include, but is not limited to, any loss of profit (whether incurred directly or indirectly), any loss of goodwill or business reputation and any other intangible loss.

(c) You acknowledge and agree that the Application utilises artificial intelligence and machine learning technologies to analyse digital communications and detect potential scams or fraudulent activity. Such technologies are inherently probabilistic and may produce inaccurate, incomplete or false results. SCAMLY PTY LTD does not warrant that the Application will detect all scams, phishing attempts or fraudulent activities, nor that its analysis will be free from error. To the maximum extent permitted by the law, SCAMLY PTY LTD shall not be liable for any loss of funds, financial loss, or harm suffered by you as a result of:

- (i) reliance on any analysis, alert, recommendation or output generated by the Application's AI systems;
- (ii) the failure of the Application to identify a scam, fraudulent communication or physhing attempt, or;
- (iii) any inaccurate, incomplete or misleading output produced by the Application.

You accept sole responsibility for any decisions made in reliance on the Application's outputs and are encouraged to exercise independent judgement before acting on any analysis provided.

(d) Notwithstanding the foregoing, the limitations in this clause do not apply to liability for:

- (i) death or personal injury caused by negligence;
- (ii) fraud, wilful misconduct or gross negligence;
- (iii) breach of confidentiality under clause 14.4;
- (iv) infringement of third-party intellectual property rights; or
- (v) any liability that cannot be excluded or limited under the Australian Consumer Law or other applicable law.`,
  },
  {
    title: "11. Competitors",
    body: `If you are in the business of providing similar Services for the purpose of providing them to users for a commercial gain, whether business users or domestic users, then you are a competitor of SCAMLY PTY LTD. Competitors are not permitted to use or access any information or content on our Application. If you breach this provision, SCAMLY PTY LTD will hold you fully responsible for any loss that we may sustain and hold you accountable for all profits that you might make from such a breach.`,
  },
  {
    title: "12. Termination of Contract",
    body: `(a) The Terms will continue to apply until terminated by either you or by SCAMLY PTY LTD as set out below.

(b) If you want to terminate the Terms, you may do so by:

- (i) providing SCAMLY PTY LTD with 1 day's notice of your intention to terminate; and
- (ii) closing your accounts for all of the services which you use, where SCAMLY PTY LTD has made this option available to you.

Your notice should be sent, in writing, to SCAMLY PTY LTD via the 'Contact Us' link on our homepage.

(c) SCAMLY PTY LTD may at any time, terminate the Terms with you if:

- (i) you have breached any provision of the Terms or intend to breach any provision;
- (ii) SCAMLY PTY LTD is required to do so by law;
- (iii) the provision of the Services to you by SCAMLY PTY LTD is, in the opinion of SCAMLY PTY LTD, no longer commercially viable.

(d) Subject to local applicable laws, SCAMLY PTY LTD reserves the right to discontinue or cancel your membership at any time and may suspend or deny, in its sole discretion, your access to all or any portion of the Application or the Services without notice if you breach any provision of hte Terms or any applicable law or if your conduct impacts SCAMLY PTY LTD's name or reputation or violates the rights of those of another party.`,
  },
  {
    title: "13. Indemnity",
    body: `You agree to indemnify SCAMLY PTY LTD, its affiliates, employees, agents, contributors, third party content providers and licensors from and against:

(a) all actions, suits, claims, demands, liabilities, costs, expenses, loss and damage (including legal fees on a full indemnity basis) incurred, suffered or arising out of or in connection with your content;

(b) any direct or indirect consequences of you accessing, using or transacting on the Application or attempts to do so; and/or

(c) any breach of the Terms.

(d) any claims arising from SCAMLY PTY LTD's breach of confidentiality obligations, unauthorized disclosure of user data, or infringement of applicable privacy laws including the Privacy Act 1988 (Cth).`,
  },
  {
    title: "14. Dispute Resolution",
    body: `14.1 Compulsory:
    If a dispute arises out of or relates to the Terms, either party may not commence any Tribunal or Court proceedings in relation to the dispute, unless the following clauses have been complied with (except where urgent interlocutory relief is sought).

14.2 Notice:
A party to the Terms claiming a dispute (Dispute) has arisen under the Terms, must give written notice to the other party detailing the nature of the dispute, the desired outcome and the action required to settle the Dispute.

14.3 Resolution:
On receipt of that notice (Notice), the parties must:

(a) Within 28 days of the Notice endeavour in good faith to resolve the Dispute expeditiously by negotiation or such other means upon which they may mutually agree;

(b) If for any reason whatsoever, 28 days after the date of the Notice, the Dispute has not been resolved, the Parties must either agree upon selection of a mediator or request that an appropriate mediator be appointed by the Resolution Institute;

(c) The Parties are equally liable for the fees and reasonable expenses of a mediator and the cost of the venue of the mediation and without limiting the foregoing undertake to pay any amounts requested by the mediator as a precondition ot the mediation commencing. The Parties must each pay their own costs associated with the mediation;

(d) The mediation will be held in Sydney, Australia.

14.4 Confidential
All communications concerning negotiations made by the Parties arising out of and in connection with this dispute resolution clause are confidential and to the extent possible, must be treated as "without prejudice" negotiations for the purpose of applicable laws of evidence.

14.5 Termination of Mediation:
If 2 months have elapsed after the start of a mediation of the Dispute and the Dispute has not been resolved, either Party may ask the mediator to terminate the mediation and the mediator must do so..`,
  },
  {
    title: "15. Venue and Jurisdiction",
    body: `The Services offered by SCAMLY PTY LTD are available to users worldwide. Notwithstanding the global availability of the service, in the event of any dispute arising out of or in relation to the Application or these Terms, you agree that the exclusive venue for resolving any such dispute shall be in the courts of New South Wales, Australia, and you irrevocably submit to the jurisdiction of those courts.`,
  },
  {
    title: "16. Governing Law",
    body: `The Terms are governed by the laws of New South Wales, Australia. Any dispute, controversy, proceeding or claim of whatever nature arising out of or in any way relating to the Terms and the rights created hereby shall be governed, interpreted and construed by, under and pursuant to the laws of New South Wales, Australia, without reference to conflict of law principles, notwithstanding mandatory rules. The validity of this governing law clause is not contested. The Terms shall be binding to the benefit of the parties hereto and their successors and assigns.`,
  },
  {
    title: "17. Severance",
    body: `If any part of these Terms is found to be void or unenforceable by a Court of competent jurisdiction, that part shall be severed and the rest of the Terms shall remain in force.`,
  },
  {
    title: "18. Data Protection Compliance",
    body: `The collection, use, storage and disclosure of personal information through the Application complies with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles. Where the Application processes personal data of individuals located in the European Union, SCAMLY PTY LTD will comply with the General Data Protection Regulation (EU) 2016/679 (GDPR), including implementing appropriate technical and organisational measures to ensure data security, providing data breach notifications within 72 hours where required, and facilitating user rights including access, rectification, erasure, data portability and objection to processing.`,
  },
];

export default function Terms() {
  const { colors } = useTheme();

  return (
    <ThemedBackground>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Terms of Service
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.company, { color: colors.textSecondary }]}>
            Scamly Pty Ltd{"\n"}81-83 Campbell Street{"\n"}Sydney NSW 2010
          </Text>

          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
            Mobile App Terms and Conditions of Use
          </Text>

          {SECTIONS.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {section.title}
              </Text>
              <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>
                {section.body}
              </Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    flex: 1,
  },
  headerSpacer: {
    width: 34,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  company: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  pageTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 24,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    marginBottom: 8,
  },
  sectionBody: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 22,
  },
});
