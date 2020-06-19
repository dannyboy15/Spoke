import { log } from "../../../lib";
import { assignmentRequiredOrAdminRole } from "../errors";
import { cacheableData } from "../../models";
import { runningInLambda } from "../lib/utils";
const ActionHandlers = require("../../../integrations/action-handlers");

export const updateContactTags = async (
  _,
  { tags, campaignContactId },
  { user }
) => {
  const contact = await cacheableData.campaignContact.load(campaignContactId);
  const campaign = await cacheableData.campaign.load(contact.campaign_id);
  await assignmentRequiredOrAdminRole(
    user,
    campaign.organization_id,
    contact.assignment_id,
    contact
  );

  await cacheableData.tagCampaignContact
    .save(campaignContactId, tags)
    .catch(err => {
      log.error(
        `Error saving updated QuestionResponse for campaignContactID ${campaignContactId} questionResponses ${JSON.stringify(
          questionResponses
        )} error ${err}`
      );
    });

  const organization = await cacheableData.organization.load(
    campaign.organization_id
  );
  // The rest is for ACTION_HANDLERS
  const actionHandlers = ActionHandlers.getActionHandlers(organization);
  const supportedActionHandlers = Object.keys(actionHandlers).filter(
    handler => actionHandlers[handler].onTagUpdate
  );

  if (supportedActionHandlers.length) {
    const promises = [];
    for (let i = 0, l = supportedActionHandlers.length; i < l; i++) {
      const actionHandlerPromise = ActionHandlers.getActionHandler(
        supportedActionHandlers[i],
        organization,
        user
      )
        .then(async handler => {
          if (handler) {
            // no, no AWAIT. FUTURE: convert to dispatch
            await handler
              .onTagUpdate(
                tags,
                campaignContactId,
                contact,
                campaign,
                organization
              )
              .catch(err => {
                log.error(
                  `Error executing handler for ${supportedActionHandlers[i]}, campaignContactId ${campaignContactId} error ${err}`
                );
              });
          }
        })
        .catch(err => {
          log.error(
            `Error loading handler for InteractionStep ${interactionStepId} InteractionStepAction ${interactionStepAction} error ${err}`
          );
        });
      promises.push(actionHandlerPromise);
    }

    if (runningInLambda()) {
      await Promise.all(promises);
    }
  }
  return contact.id;
};

export default updateContactTags;
