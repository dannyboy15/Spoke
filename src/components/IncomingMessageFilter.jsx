import React, { Component } from "react";
import type from "prop-types";
import _ from "lodash";

import TextField from "@material-ui/core/TextField";
import Checkbox from "@material-ui/core/Checkbox";
import FormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import CardContent from "@material-ui/core/CardContent";
import Collapse from "@material-ui/core/Collapse";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import IconButton from "@material-ui/core/IconButton";
import Switch from "@material-ui/core/Switch";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import Input from "@material-ui/core/Input";
import Autocomplete from "@material-ui/lab/Autocomplete";

import theme from "../styles/theme";
import { dataSourceItem } from "./utils";
import SelectedCampaigns from "./SelectedCampaigns";
import TagsSelector from "./TagsSelector";

import { StyleSheet, css } from "aphrodite";

const styles = StyleSheet.create({
  container: {
    ...theme.layouts.multiColumn.container,
    alignContent: "flex-start",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    alignItems: "center"
  },
  flexColumn: {
    width: "30%"
  },
  toggleFlexColumn: {
    width: "30%"
  },
  spacer: {
    marginRight: "30px"
  },
  cardHeader: {
    cursor: "pointer"
  }
});

export const MESSAGE_STATUSES = {
  all: {
    name: "All",
    children: ["needsResponse", "needsMessage", "convo", "messaged"]
  },
  needsResponse: {
    name: "Needs Texter Response",
    children: []
  },
  needsMessage: {
    name: "Needs First Message",
    children: []
  },
  convo: {
    name: "Active Conversation",
    children: []
  },
  messaged: {
    name: "First Message Sent",
    children: []
  },
  closed: {
    name: "Closed",
    children: []
  },
  needsResponseExpired: {
    name: "Expired Needs Response",
    children: []
  }
};

export const ALL_CAMPAIGNS = -1;

export const CAMPAIGN_TYPE_FILTERS = [[ALL_CAMPAIGNS, "All Campaigns"]];

export const ALL_TEXTERS = -1;
export const UNASSIGNED = -2;

export const TEXTER_FILTERS = [
  [ALL_TEXTERS, " All Texters"],
  [UNASSIGNED, " Unassigned"]
];

export const MessageStatusSelection = ({
  label,
  width,
  statusFilter,
  ...props
}) => (
  <FormControl style={{ width }}>
    <InputLabel id="contact-message-status">
      {label || "Contact message status"}
    </InputLabel>
    <Select {...props} labelId="contact-message-status" input={<Input />}>
      {Object.keys(MESSAGE_STATUSES)
        .filter(statusFilter || (() => true))
        .map(messageStatus => (
          <MenuItem key={messageStatus} value={messageStatus}>
            {MESSAGE_STATUSES[messageStatus].name}
          </MenuItem>
        ))}
    </Select>
  </FormControl>
);

class IncomingMessageFilter extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedCampaigns: [],
      messageTextFilter: this.props.messageTextFilter,
      messageFilter:
        this.props.messageFilter && this.props.messageFilter.split(","),
      tagsFilter: this.props.tagsFilter,
      errorCode: this.props.errorCode
    };
  }

  componentWillUpdate = (nextProps, nextState) => {
    if (nextProps.texterSearchText && !this.state.texterSearchText) {
      this.state.texterSearchText = nextProps.texterSearchText;
    }
    if (nextProps.selectedCampaigns && !this.state.selectedCampaigns.length) {
      this.state.selectedCampaigns = nextProps.selectedCampaigns;
    }
  };

  onMessageFilterSelectChanged = values => {
    this.setState({ messageFilter: values });
    const messageStatuses = new Set();
    values.forEach(value => {
      const children = MESSAGE_STATUSES[value].children;
      if (children.length > 0) {
        children.forEach(child => messageStatuses.add(child));
      } else {
        messageStatuses.add(value);
      }
    });

    const messageStatusesString = Array.from(messageStatuses).join(",");
    this.props.onMessageFilterChanged(messageStatusesString);
  };

  onCampaignSelected = (event, selection) => {
    this.applySelectedCampaigns(selection);
  };

  onTexterSelected = (event, selection) => {
    if (selection && selection.rawValue) {
      this.props.onTexterChanged(parseInt(selection.rawValue, 10));
    } else {
      this.props.onTexterChanged();
    }
  };

  onTagsFilterChanged = tagsFilter => {
    this.setState({ tagsFilter });
    this.props.onTagsFilterChanged(tagsFilter);
  };

  applySelectedCampaigns = selectedCampaigns => {
    this.setState({
      selectedCampaigns,
      campaignSearchText: ""
    });

    this.fireCampaignChanged(selectedCampaigns);
  };

  handleCampaignRemoved = campaignId => {
    const selectedCampaigns = this.state.selectedCampaigns.filter(
      campaign => campaign.key !== campaignId
    );
    this.applySelectedCampaigns(selectedCampaigns);
  };

  handleClearCampaigns = () => {
    this.applySelectedCampaigns([]);
  };

  fireCampaignChanged = selectedCampaigns => {
    this.props.onCampaignChanged(
      this.selectedCampaignIds(selectedCampaigns),
      selectedCampaigns
    );
  };

  removeAllCampaignsFromCampaignsArray = campaign =>
    campaign.key !== ALL_CAMPAIGNS;

  selectedCampaignIds = selectedCampaigns =>
    selectedCampaigns.map(campaign =>
      parseInt(campaign.key || campaign.rawValue, 10)
    );

  campaignsNotAlreadySelected = campaign => {
    return !this.selectedCampaignIds(this.state.selectedCampaigns).includes(
      parseInt(campaign.id, 10)
    );
  };

  render() {
    const texterNodes = TEXTER_FILTERS.map(texterFilter =>
      dataSourceItem(texterFilter[1], texterFilter[0])
    ).concat(
      !this.props.texters
        ? []
        : this.props.texters.map(user => {
            const userId = parseInt(user.id, 10);
            return dataSourceItem(user.displayName, userId);
          })
    );
    texterNodes.sort((left, right) => {
      return left.text.localeCompare(right.text, "en", { sensitivity: "base" });
    });

    const campaignNodes = CAMPAIGN_TYPE_FILTERS.map(campaignTypeFilter =>
      dataSourceItem(campaignTypeFilter[1], campaignTypeFilter[0])
    ).concat(
      !this.props.campaigns
        ? []
        : this.props.campaigns
            .filter(this.campaignsNotAlreadySelected)
            .map(campaign => {
              const campaignId = parseInt(campaign.id, 10);
              const campaignDisplay = `${campaignId}: ${campaign.title}`;
              return dataSourceItem(campaignDisplay, campaignId);
            })
    );
    campaignNodes.sort((left, right) => {
      return left.text.localeCompare(right.text, "en", { sensitivity: "base" });
    });

    const { expanded } = this.state;

    return (
      <Card>
        <CardHeader
          title="Message Filter"
          action={
            <IconButton>
              <ExpandMoreIcon />
            </IconButton>
          }
          onClick={() => {
            this.setState({ expanded: !expanded });
          }}
          className={css(styles.cardHeader)}
        />
        <Collapse
          in={expanded}
          timeout="auto"
          unmountOnExit
          style={{
            margin: "20px"
          }}
        >
          <CardContent>
            <div className={css(styles.container)}>
              <div className={css(styles.toggleFlexColumn)}>
                <FormControlLabel
                  control={<Switch color="primary" />}
                  label="Active Campaigns"
                  labelPlacement="start"
                  onChange={this.props.onActiveCampaignsToggled}
                  checked={
                    this.props.includeActiveCampaigns ||
                    !this.props.includeArchivedCampaigns
                  }
                />
                <br />
                <FormControlLabel
                  control={<Switch color="primary" />}
                  label="Archived Campaigns"
                  labelPlacement="start"
                  onChange={this.props.onArchivedCampaignsToggled}
                  checked={this.props.includeArchivedCampaigns}
                />
              </div>
              <div className={css(styles.spacer)} />
              <div className={css(styles.toggleFlexColumn)}>
                <FormControlLabel
                  control={<Switch color="primary" />}
                  label="Not Opted Out"
                  labelPlacement="start"
                  onChange={this.props.onNotOptedOutConversationsToggled}
                  checked={
                    this.props.includeNotOptedOutConversations ||
                    !this.props.includeOptedOutConversations
                  }
                />
                <br />
                <FormControlLabel
                  control={<Switch color="primary" />}
                  label="Opted Out"
                  labelPlacement="start"
                  onChange={this.props.onOptedOutConversationsToggled}
                  checked={this.props.includeOptedOutConversations}
                />
              </div>
              <div className={css(styles.spacer)} />
              <div className={css(styles.toggleFlexColumn)}>
                <SelectedCampaigns
                  campaigns={this.state.selectedCampaigns}
                  onDeleteRequested={this.handleCampaignRemoved}
                  onClear={this.handleClearCampaigns}
                />
              </div>
            </div>

            <div className={css(styles.container)}>
              <div className={css(styles.flexColumn)}>
                <MessageStatusSelection
                  width="100%"
                  multiple
                  placeholder={"Which messages?"}
                  value={this.state.messageFilter || []}
                  onChange={event => {
                    const { value } = event.target;
                    this.onMessageFilterSelectChanged(value);
                  }}
                />
              </div>
              <div className={css(styles.spacer)} />
              <div className={css(styles.flexColumn)}>
                <Autocomplete
                  multiple
                  options={campaignNodes}
                  onChange={this.onCampaignSelected}
                  getOptionLabel={option => option.text || ""}
                  value={this.props.selectedCampaigns || []}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Select a campaign"
                      placeholder="Search for a campaign"
                    />
                  )}
                />
              </div>
              <div className={css(styles.spacer)} />
              <div className={css(styles.flexColumn)}>
                <Autocomplete
                  options={texterNodes}
                  onChange={this.onTexterSelected}
                  getOptionLabel={option => option.text || ""}
                  value={texterNodes.find(
                    v => v.text === this.props.texterSearchText
                  )}
                  onInputChange={(event, newInputValue) => {
                    this.setState({ texterSearchText: newInputValue });
                  }}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Texter"
                      placeholder="Search for a texter"
                    />
                  )}
                />
                <div>
                  <FormControlLabel
                    label="search senders (instead of assignments)"
                    labelPlacement="end"
                    checked={this.props.assignmentsFilter.sender || false}
                    onChange={this.props.onTexterChanged}
                    control={<Checkbox color="primary" />}
                  />
                </div>
              </div>
              <div className={css(styles.flexColumn)}>
                <TextField
                  fullWidth
                  placeholder="Search message text"
                  label="Search message text"
                  value={this.state.messageTextFilter || ""}
                  onChange={event => {
                    const messageTextFilter = event.target.value;
                    this.setState({ messageTextFilter });
                  }}
                  onKeyPress={evt => {
                    if (evt.key === "Enter") {
                      this.props.onMessageTextFilterChanged(
                        this.state.messageTextFilter
                      );
                    }
                  }}
                />
              </div>
              <div className={css(styles.spacer)} />
              <div className={css(styles.flexColumn)}>
                <TagsSelector
                  onChange={this.onTagsFilterChanged}
                  tagsFilter={this.state.tagsFilter}
                  tags={this.props.tags}
                />
              </div>
              <div className={css(styles.spacer)} />
              <div className={css(styles.flexColumn)}>
                <TextField
                  placeholder="Error code number"
                  label="Error codes"
                  value={this.state.errorCode}
                  onChange={event => {
                    const errorCode = event.target.value;
                    this.setState({ errorCode });
                  }}
                  onKeyPress={evt => {
                    if (evt.key === "Enter") {
                      this.props.onErrorCodeChanged(this.state.errorCode);
                    }
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Collapse>
      </Card>
    );
  }
}

IncomingMessageFilter.propTypes = {
  onCampaignChanged: type.func.isRequired,
  onTexterChanged: type.func.isRequired,
  onMessageTextFilterChanged: type.func.isRequired,
  onErrorCodeChanged: type.func.isRequired,
  onActiveCampaignsToggled: type.func.isRequired,
  onArchivedCampaignsToggled: type.func.isRequired,
  includeArchivedCampaigns: type.bool.isRequired,
  includeActiveCampaigns: type.bool.isRequired,
  onNotOptedOutConversationsToggled: type.func.isRequired,
  onOptedOutConversationsToggled: type.func.isRequired,
  includeNotOptedOutConversations: type.bool.isRequired,
  includeOptedOutConversations: type.bool.isRequired,
  campaigns: type.array.isRequired,
  texters: type.array.isRequired,
  onMessageFilterChanged: type.func.isRequired,
  assignmentsFilter: type.shape({
    texterId: type.number,
    sender: type.bool
  }).isRequired,
  onTagsFilterChanged: type.func.isRequired,
  tags: type.arrayOf(type.object).isRequired,
  tagsFilter: type.object.isRequired,
  messageTextFilter: type.string,
  texterSearchText: type.string,
  errorCode: type.arrayOf(type.number),
  selectedCampaigns: type.array
};

export default IncomingMessageFilter;
