// 隐私投票智能合约 - Leo 4.1.0 兼容版
program privacy_voting.aleo {

    // 提案结构体
    struct Proposal {
        id: u64,
        title: scalar,
        description: scalar,
        agree_count: u64,
        disagree_count: u64,
        active: bool,
    }

    // 投票凭证（隐私保护）
    record Ticket {
        owner: address,
        proposal_id: u64,
        voted: bool,
    }

    // 提案存储映射
    mapping proposals: u64 => Proposal;

    // 创建提案
    function propose(
        id: u64,
        title: scalar,
        description: scalar,
    ) {
        let proposal: Proposal = Proposal {
            id: id,
            title: title,
            description: description,
            agree_count: 0u64,
            disagree_count: 0u64,
            active: true,
        };
        Mapping::set(proposals, id, proposal);
    }

    // 生成投票凭证（隐私）
    function new_ticket(
        proposal_id: u64,
    ) -> Ticket {
        return Ticket {
            owner: self.caller,
            proposal_id: proposal_id,
            voted: false,
        };
    }

    // 投赞成票
    function agree(
        mut ticket: Ticket,
    ) -> Ticket {
        let proposal: Proposal = Mapping::get(proposals, ticket.proposal_id);
        proposal.agree_count += 1u64;
        Mapping::set(proposals, ticket.proposal_id, proposal);
        ticket.voted = true;
        return ticket;
    }

    // 投反对票
    function disagree(
        mut ticket: Ticket,
    ) -> Ticket {
        let proposal: Proposal = Mapping::get(proposals, ticket.proposal_id);
        proposal.disagree_count += 1u64;
        Mapping::set(proposals, ticket.proposal_id, proposal);
        ticket.voted = true;
        return ticket;
    }

    // 获取投票结果
    function get_results(
        id: u64,
    ) -> (u64, u64) {
        let proposal: Proposal = Mapping::get(proposals, id);
        return (proposal.agree_count, proposal.disagree_count);
    }
}